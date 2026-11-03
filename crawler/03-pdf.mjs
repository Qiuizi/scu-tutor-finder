// 阶段三：解析《计算机学院（软件学院）研究生导师名录》PDF —— 权威研究方向来源
// 策略：利用 PDF 文本坐标还原表格列，比纯文本正则更可靠
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const COLS = [
  { key: 'name', min: 0, max: 170 },
  { key: 'title', min: 170, max: 262 },
  { key: 'research', min: 262, max: 470 },
  { key: 'email', min: 470, max: 565 },
  { key: 'note', min: 565, max: 9999 },
];

// 页眉/表头/正文噪声
const NOISE = /^(研究生导师名录|姓名|职称|研究方向|电子邮箱|备注|中国成都四川大学计算机学院|说明|计算机学院（软件学院）)$/;

function colOf(x) {
  return COLS.find((c) => x >= c.min && x < c.max)?.key ?? 'note';
}

function rowsFromPage(items) {
  // 关键：按 y 降序后聚类（容差 2），不能用 round 分桶——相邻行会被误合并
  const pts = items
    .map((it) => ({ s: it.str.trim(), x: it.transform[4], y: it.transform[5] }))
    .filter((p) => p.s)
    .sort((a, b) => b.y - a.y);

  const rows = [];
  let cur = null;
  for (const p of pts) {
    if (cur && Math.abs(p.y - cur.y) <= 2) cur.items.push(p);
    else {
      cur = { y: p.y, items: [p] };
      rows.push(cur);
    }
  }
  return rows.map((r) => {
    const rec = { name: '', title: '', research: '', email: '', note: '' };
    for (const it of r.items.sort((a, b) => a.x - b.x)) rec[colOf(it.x)] += it.s;
    return rec;
  });
}

const TITLE_RE = /^(院士|正高|副高|中级|初级)/;

/** 职称列可能混入方向文字，用职称白名单前缀拆分 */
function splitTitle(r) {
  const raw = r.title.replace(/\s+/g, '');
  const m = raw.match(TITLE_RE);
  if (!m) return { title: raw, extra: '' };
  return { title: m[1], extra: raw.slice(m[1].length) };
}

const doc = await getDocument({ data: new Uint8Array(readFileSync('.tmp/tutor.pdf')) }).promise;
const out = [];
let skipped = 0;

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const { items } = await page.getTextContent();
  for (const r of rowsFromPage(items)) {
    const name = r.name.replace(/\s+/g, '');
    // 姓名列应为 2-4 个汉字
    if (!/^[\u4e00-\u9fa5]{2,4}$/.test(name)) { skipped++; continue; }
    if (NOISE.test(name)) { skipped++; continue; }
    // 跨页续行会产生假姓名行：真导师的职称必在白名单内
    if (!TITLE_RE.test(r.title)) { skipped++; continue; }
    const { title, extra } = splitTitle(r);
    // 研究方向列可能被 "/" 拆成多个碎片，重新拼接规范化
    const research = (r.research + extra)
      .split('/')
      .map((s) => s.replace(/\s+/g, '').trim())
      .filter(Boolean)
      .join(' / ');
    out.push({
      name,
      title,
      research,
      pdfEmail: r.email.replace(/\s+/g, ''),
      note: r.note.replace(/\s+/g, ''),
      page: p,
    });
  }
}

// 同一人可能出现在多页（续表），按姓名合并
const merged = new Map();
for (const r of out) {
  if (!merged.has(r.name)) merged.set(r.name, r);
  else {
    const prev = merged.get(r.name);
    if (!prev.research && r.research) prev.research = r.research;
    if (!prev.note && r.note) prev.note = r.note;
  }
}
const list = [...merged.values()];
writeFileSync('data/pdf-tutors.json', JSON.stringify(list, null, 2), 'utf8');

console.log(`解析到 ${list.length} 位导师（跳过噪声行 ${skipped}）`);
console.log(`有研究方向 ${list.filter((t) => t.research).length} 位`);
console.log(`无研究方向 ${list.filter((t) => !t.research).length} 位`);
console.log('\n职称分布:', list.reduce((a, t) => ((a[t.title] = (a[t.title] || 0) + 1), a), {}));
console.log('\n样本:');
list.slice(0, 5).forEach((t) => console.log(`  ${t.name} | ${t.title} | ${t.research} | ${t.pdfEmail}`));
