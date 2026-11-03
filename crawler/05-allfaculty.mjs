// 阶段五：按拼音首字母枚举全校教师主页，用于补回名录中有、但学院列表未收录的导师
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { get, sleep } from './lib.mjs';

const CACHE = '.cache/pinyin';
mkdirSync(CACHE, { recursive: true });

const ITEM_RE = /addimg\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"?(\d+)"?\s*\)/g;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const all = new Map();

for (const py of LETTERS) {
  let page = 1;
  let totalPage = 1;
  while (page <= totalPage && page <= 40) {
    const file = `${CACHE}/${py}-${page}.html`;
    let html;
    if (existsSync(file)) html = readFileSync(file, 'utf8');
    else {
      html = await get(
        `https://faculty.scu.edu.cn/pijslb.jsp?totalpage=${totalPage}&PAGENUM=${page}&urltype=tsites.PinYinTeacherList&wbtreeid=1001&py=${py}&lang=zh_CN`
      );
      writeFileSync(file, html, 'utf8');
      await sleep(180);
    }
    if (page === 1) totalPage = Number(html.match(/totalpage=(\d+)/)?.[1] || 1);
    let n = 0;
    for (const m of html.matchAll(ITEM_RE)) {
      const [, , href, name, id] = m;
      const slug = href.match(/^\/([^/]+)\//)?.[1];
      if (!slug || !name) continue;
      n++;
      if (!all.has(slug)) all.set(slug, { slug, name: name.trim(), id: Number(id) });
    }
    if (n === 0) break;
    page++;
  }
  console.log(`${py}: ${all.size} 人累计`);
}

const allTeachers = [...all.values()];
writeFileSync('data/all-faculty.json', JSON.stringify(allTeachers, null, 2), 'utf8');
console.log(`\n全校教师主页共 ${allTeachers.length} 人 -> data/all-faculty.json`);

// 检查名录中缺失的导师是否已找到
const pdf = JSON.parse(readFileSync('data/pdf-tutors.json', 'utf8'));
const roster = JSON.parse(readFileSync('data/roster.json', 'utf8'));
const known = new Set(roster.map((t) => t.name));
const byName = new Map(allTeachers.map((t) => [t.name, t]));
const missing = pdf.filter((p) => !known.has(p.name));
const found = missing.filter((m) => byName.has(m.name));
console.log(`\n名录中缺失导师 ${missing.length} 人，已在全校主页库找到 ${found.length} 人`);
found.forEach((f) => console.log(`  ✓ ${f.name} -> ${byName.get(f.name).slug}`));
const stillMissing = missing.filter((m) => !byName.has(m.name)).map((m) => m.name);
if (stillMissing.length) console.log(`\n仍未找到: ${stillMissing.join(' ')}`);
