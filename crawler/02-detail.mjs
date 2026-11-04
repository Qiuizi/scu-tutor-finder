// 阶段二：抓取每位教师的个人主页首页，解析结构化字段
// 设计：先落盘原始 HTML（断点续传），再统一解析，避免重跑时重复请求
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { get, sleep, toText } from './lib.mjs';

const CACHE = '.cache/html';
const ENCRYPT_API = 'https://faculty.scu.edu.cn/system/resource/tsites/tsitesencrypt.jsp';
const CONCURRENCY = 5;

mkdirSync(CACHE, { recursive: true });
const roster = JSON.parse(readFileSync('data/roster.json', 'utf8'));

/**
 * 解析基本信息。站点存在两套页面模板，必须都兼容：
 *   模板A <div class="bs bs-1"><p>职务：教授</p>…
 *   模板B <div class="t_content"><ul><li><strong>职务：</strong>教授</li>…
 */
function parseInfoBlock(html) {
  const info = {};
  const put = (key, raw) => {
    const val = toText(raw).trim();
    if (val && !val.includes('_tsites_encrypt') && !info[key]) info[key] = val;
  };

  // 模板A
  const blockA = html.match(/<div class="bs bs-1">([\s\S]*?)<\/div>/)?.[1] || '';
  for (const m of blockA.matchAll(/<p>\s*([^<:：]{2,10})[：:]\s*([\s\S]*?)<\/p>/g)) put(m[1].trim(), m[2]);

  // 模板B
  for (const m of html.matchAll(/<li[^>]*>\s*<strong>\s*([^<:：]{2,10})[：:]\s*<\/strong>([\s\S]*?)<\/li>/g)) {
    put(m[1].trim(), m[2]);
  }

  return info;
}

/**
 * 解析「研究方向」小节。
 * 官网是最新最权威的来源，优先于 PDF 名录（PDF 是较早的静态文件，方向与职称都可能过时）。
 */
function parseResearch(html) {
  for (const heading of ['研究方向', '研究领域']) {
    const idx = html.indexOf(`>${heading}</h2>`);
    if (idx < 0) continue;

    // 标题后紧跟「更多」链接，再往后才是内容块
    const seg = html.slice(idx, idx + 5000);
    const ct = seg.match(/<div class="ct[^"]*">([\s\S]*?)<\/div>/)?.[1] || '';
    if (!ct || /暂无内容/.test(ct)) continue;

    // 优先取指向 yjfx 栏目的锚点，取不到就退回通用锚点
    const strict = [...ct.matchAll(/<a[^>]*yjfx[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim());
    const items = strict.length
      ? strict
      : [...ct.matchAll(/<a[^>]*>([^<]{2,30})<\/a>/g)].map((m) => m[1].trim());
    const cleaned = items.filter((s) => s && s !== '暂无内容');
    if (cleaned.length) return [...new Set(cleaned)];
  }
  return [];
}

/** 解析「个人简介」正文 */
function parseBio(html) {
  const idx = html.indexOf('<!--个人简介-->');
  if (idx < 0) return '';
  const seg = html.slice(idx, idx + 12000);
  const ct = seg.match(/<div class="ct[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] || '';
  return toText(ct).slice(0, 4000);
}

/** 提取加密邮箱并通过站点自带接口解密 */
async function parseEmail(html) {
  const hex = html.match(/id="_tsites_encryp_tsteacher_tsemail"[^>]*>([0-9a-f]{32,})</)?.[1];
  if (!hex) return '';
  try {
    const url = `${ENCRYPT_API}?id=_tsites_encryp_tsteacher_tsemail&content=${hex}&mode=8`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://faculty.scu.edu.cn/' } });
    const data = await res.json();
    return String(data.content || '').replace(/^mailto:/, '').trim();
  } catch {
    return '';
  }
}

/** 职称等级兜底：从「职务」推断正高/副高/中级 */
function inferRank(title) {
  if (!title) return '';
  if (/院士/.test(title)) return '院士';
  if (/教授|研究员/.test(title) && !/副|助理/.test(title)) return '正高';
  if (/副|高级工程师|高工/.test(title)) return '副高';
  if (/讲师|工程师|助理/.test(title)) return '中级';
  return '';
}

async function fetchOne(t) {
  const file = `${CACHE}/${t.slug}.html`;
  let html;
  if (existsSync(file)) html = readFileSync(file, 'utf8');
  else {
    html = await get(t.homepage);
    writeFileSync(file, html, 'utf8');
    await sleep(250);
  }
  const info = parseInfoBlock(html);
  const rankRaw =
    html.match(/<div class="nm clearfix">\s*<h2>[^<]*<em[^>]*><\/em><\/h2>\s*<span[^>]*>([^<]*)<\/span>/)?.[1]?.trim() ||
    '';
  return {
    ...t,
    rank: rankRaw || inferRank(info['职务'] || ''), // 正高 / 副高 / 中级
    title: info['职务'] || '',              // 教授 / 副教授 / 讲师
    department: info['所在单位'] || '',
    degree: info['学历'] || '',
    hiredAt: info['入职时间'] || '',
    office: info['办公地点'] || '',
    status: info['在职信息'] || '',
    email: await parseEmail(html),
    research: parseResearch(html),
    bio: parseBio(html),
  };
}

// 简单并发池
const queue = roster.slice();
const out = [];
let done = 0;

async function worker() {
  while (queue.length) {
    const t = queue.shift();
    try {
      const rec = await fetchOne(t);
      out.push(rec);
      done++;
      const flag = rec.research.length ? '' : ' ⚠无方向';
      console.log(`[${done}/${roster.length}] ${rec.name} ${rec.title || rec.rank} ${rec.email || '无邮箱'}${flag}`);
    } catch (e) {
      done++;
      console.error(`[${done}/${roster.length}] ${t.name} 失败: ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const teachers = out.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
writeFileSync('data/teachers.raw.json', JSON.stringify(teachers, null, 2), 'utf8');

const stat = {
  总数: teachers.length,
  有职称: teachers.filter((t) => t.title).length,
  有邮箱: teachers.filter((t) => t.email).length,
  有研究方向: teachers.filter((t) => t.research.length).length,
  有简介: teachers.filter((t) => t.bio.length > 50).length,
  有办公地点: teachers.filter((t) => t.office).length,
};
console.log('\n字段完整度:', stat);
console.log('已写入 data/teachers.raw.json');
