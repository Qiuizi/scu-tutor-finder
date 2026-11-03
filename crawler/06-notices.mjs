// 阶段六：抓取学院通知公告（用于「动态更新」与 Agent 问答）
import { writeFileSync } from 'node:fs';
import { get, sleep } from './lib.mjs';

// 博达 CMS 列表页通用配置：site + 栏目路径 + 分类
// 注：cs.scu.edu.cn 部署了瑞数 WAF（$_ts 动态防护），静态请求取不到 HTML，暂不纳入
const SOURCES = [
  { site: 'https://ai.scu.edu.cn', path: '/xwgg/tzgg.htm', college: '人工智能学院', type: '通知公告' },
  { site: 'https://ai.scu.edu.cn', path: '/xwgg/xwdt.htm', college: '人工智能学院', type: '新闻动态' },
  { site: 'https://ai.scu.edu.cn', path: '/kycg.htm', college: '人工智能学院', type: '科研成果' },
  { site: 'https://ai.scu.edu.cn', path: '/xshd.htm', college: '人工智能学院', type: '学术活动' },
  { site: 'https://ai.scu.edu.cn', path: '/szjy.htm', college: '人工智能学院', type: '数智菁英' },
];

// 两种列表结构都要兼容：
//   通知公告 <a><div class="date"><p>29<i>/</i>10</p><span>2026</span></div><div class="con"><h3>标题</h3>
//   新闻动态 <a class="wl flex"><div class="scale">…图…</div><h3>标题</h3>（无日期）
const LINK_RE = /<a[^>]*href="((?:\.\.\/)?info\/\d+\/\d+\.htm)"[^>]*>([\s\S]{0,3000}?)<\/a>/g;
const CN_DATE = /<p>\s*(\d{1,2})\s*<i>\/<\/i>\s*(\d{1,2})\s*<\/p>\s*<span>\s*(\d{4})\s*<\/span>/;
const ISO_DATE = /(\d{4})-(\d{1,2})-(\d{1,2})/;

const clean = (s) =>
  s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function parseList(html, url, src) {
  const out = [];
  for (const m of html.matchAll(LINK_RE)) {
    const [, href, block] = m;
    const title = clean(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || '');
    if (!title || title.length < 4) continue;
    let date = '';
    const cn = block.match(CN_DATE);
    if (cn) date = `${cn[3]}-${cn[2].padStart(2, '0')}-${cn[1].padStart(2, '0')}`;
    else {
      const iso = block.match(ISO_DATE);
      if (iso) date = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    }
    const abs = href.startsWith('http') ? href : new URL(href, url).href;
    out.push({
      id: abs.match(/info\/(\d+)\/(\d+)\.htm/)?.slice(1).join('-') || abs,
      title,
      date,
      url: abs,
      college: src.college,
      type: src.type,
    });
  }
  return out;
}

const all = [];
for (const src of SOURCES) {
  const url = src.site + src.path;
  try {
    const html = await get(url);
    const items = parseList(html, url, src);
    console.log(`${src.college} ${src.type}: ${items.length} 条`);
    all.push(...items);
    await sleep(250);
  } catch (e) {
    console.warn(`${src.college} ${src.type} 抓取失败: ${e.message}`);
  }
}

// 去重 + 按日期倒序（无日期的排后面）
const seen = new Set();
const notices = all
  .filter((n) => !seen.has(n.url) && seen.add(n.url))
  .sort((a, b) => (b.date || '0').localeCompare(a.date || '0'));

writeFileSync('data/notices.json', JSON.stringify(notices, null, 2), 'utf8');
console.log(`\n合计 ${notices.length} 条 -> data/notices.json`);
notices.slice(0, 6).forEach((n) => console.log(`  ${n.date || '无日期'} [${n.type}] ${n.title.slice(0, 34)}`));
