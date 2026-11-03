// 阶段一：抓取学院教师名单（列表页数据以 addimg(...) 形式内嵌，一条正则即可全抽）
import { writeFileSync } from 'node:fs';
import { get, sleep, abs } from './lib.mjs';

const COLLEGE_ID = 1035; // 计算机学院（软件学院）
const COLLEGE_NAME = '计算机学院（软件学院）';
const LIST_URL = (page) =>
  `https://faculty.scu.edu.cn/xyjs.jsp?totalpage=21&PAGENUM=${page}&urltype=tsites.CollegeTeacherList&wbtreeid=1012&st=0&id=${COLLEGE_ID}&lang=zh_CN`;

const ITEM_RE = /addimg\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"?(\d+)"?\s*\)/g;

function parseList(html) {
  const out = [];
  for (const m of html.matchAll(ITEM_RE)) {
    const [, avatar, href, name, id] = m;
    const slug = href.match(/^\/([^/]+)\//)?.[1];
    if (!slug || !name) continue;
    out.push({
      id: Number(id),
      name: name.trim(),
      slug,
      avatar: avatar.startsWith('http') ? avatar : abs(avatar),
      hasCustomAvatar: !avatar.includes('defaultteacherimg'),
      homepage: abs(href),
      college: COLLEGE_NAME,
    });
  }
  return out;
}

const totalPage = Number(process.argv[2] || 21);
const seen = new Map();
let total = null;

for (let p = 1; p <= totalPage; p++) {
  const html = await get(LIST_URL(p));
  const items = parseList(html);
  if (total === null) total = Number(html.match(/共\s*(\d+)\s*条/)?.[1] || 0);
  for (const it of items) if (!seen.has(it.slug)) seen.set(it.slug, it);
  console.log(`页码 ${p}/${totalPage}  本页 ${items.length} 条  累计 ${seen.size}${total ? ` / 共${total}条` : ''}`);
  if (items.length === 0) break;
  await sleep(400);
}

const teachers = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
writeFileSync('data/roster.json', JSON.stringify(teachers, null, 2), 'utf8');
console.log(`\n完成：${teachers.length} 位教师 -> data/roster.json`);
if (total && teachers.length !== total) console.warn(`注意：公告总数 ${total} 与实际抓取 ${teachers.length} 不一致，请检查分页`);

const noAvatar = teachers.filter((t) => !t.hasCustomAvatar).length;
console.log(`有自定义头像 ${teachers.length - noAvatar} 人，用默认头像 ${noAvatar} 人`);
