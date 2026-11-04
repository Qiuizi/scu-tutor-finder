// 阶段七：抓取每位教师的论文成果与科研项目
// 栏目页结构：
//   <li><a href="/<slug>/zh_CN/lwcg/<id>/content/<cid>.htm#lwcg"><i class="ico"></i>
//       <h2 ...><i>标题文字</i></h2></a></li>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { get, sleep, toText } from './lib.mjs';

const CACHE = '.cache/achv';
mkdirSync(CACHE, { recursive: true });

const CONCURRENCY = 5;
const MAX_ITEMS = 12; // 每人每类最多保留条数，避免数据膨胀

const teachers = JSON.parse(readFileSync('data/teachers.json', 'utf8'));

/** 从已缓存的 index 页里取栏目入口 */
function sectionUrl(slug, code) {
  const file = `.cache/html/${slug}.html`;
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const m = html.match(new RegExp(`href="(/${slug}/zh_CN/${code}/\\d+/list/index\\.htm)"`));
  return m ? `https://faculty.scu.edu.cn${m[1]}` : null;
}

/** 解析栏目列表页里的条目 */
function parseItems(html) {
  const out = [];
  const re = /<a[^>]*href="([^"]*\/content\/\d+\.htm[^"]*)"[^>]*>[\s\S]{0,400}?<h2[^>]*>([\s\S]*?)<\/h2>/g;
  for (const m of html.matchAll(re)) {
    const title = toText(m[2]).replace(/\s+/g, ' ').trim();
    if (title.length < 4) continue;
    out.push({ title, url: m[1].startsWith('http') ? m[1] : `https://faculty.scu.edu.cn${m[1]}` });
  }
  return out;
}

async function fetchSection(slug, code) {
  const cacheFile = `${CACHE}/${slug}-${code}.json`;
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));

  const url = sectionUrl(slug, code);
  if (!url) return [];

  try {
    const html = await get(url);
    const items = parseItems(html).slice(0, MAX_ITEMS);
    writeFileSync(cacheFile, JSON.stringify(items), 'utf8');
    await sleep(200);
    return items;
  } catch {
    return [];
  }
}

const targets = teachers.filter((t) => t.slug);
const queue = targets.slice();
const result = {};
let done = 0;

async function worker() {
  while (queue.length) {
    const t = queue.shift();
    const [papers, projects] = await Promise.all([
      fetchSection(t.slug, 'lwcg'),
      fetchSection(t.slug, 'kyxm'),
    ]);
    result[t.slug] = { papers, projects };
    done++;
    if (papers.length || projects.length) {
      console.log(`[${done}/${targets.length}] ${t.name} 论文${papers.length} 项目${projects.length}`);
    } else if (done % 20 === 0) {
      console.log(`[${done}/${targets.length}] …`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

writeFileSync('data/achievements.json', JSON.stringify(result, null, 2), 'utf8');

// 合并进主数据
for (const t of teachers) {
  const a = t.slug ? result[t.slug] : null;
  if (a) {
    if (a.papers.length) t.papers = a.papers;
    if (a.projects.length) t.projects = a.projects;
  }
}
writeFileSync('data/teachers.json', JSON.stringify(teachers, null, 2), 'utf8');

const withPapers = teachers.filter((t) => t.papers?.length).length;
const withProjects = teachers.filter((t) => t.projects?.length).length;
const totalPapers = teachers.reduce((s, t) => s + (t.papers?.length || 0), 0);
console.log(`\n有论文数据 ${withPapers} 人（共 ${totalPapers} 条）`);
console.log(`有项目数据 ${withProjects} 人`);
