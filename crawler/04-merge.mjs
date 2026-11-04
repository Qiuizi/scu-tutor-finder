// 阶段四：多源合并
// 主名单 = 学院教师主页列表（166，字段最全）+ 名录独有导师（仅在 PDF 中，无个人主页）
import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('data/teachers.raw.json', 'utf8'));
const pdf = JSON.parse(readFileSync('data/pdf-tutors.json', 'utf8'));

const pdfByName = new Map(pdf.map((t) => [t.name, t]));

const BAD_RESEARCH = /IF:|SCI|CCF-|\(\d{4}\)|^\d|^、|、$/;

function normalizeResearch(rawStr) {
  if (!rawStr) return [];
  return rawStr
    .split(/[\/、,，;；]/)
    .map((s) => s.replace(/\s+/g, '').trim())
    .filter((s) => s.length >= 2 && s.length <= 24 && !BAD_RESEARCH.test(s));
}

let fromPdf = 0, fromPage = 0, stillEmpty = 0;

const merged = raw.map((t) => {
  const p = pdfByName.get(t.name);
  // 官网锚点本身就是一个完整方向名，不能再按分隔符拆（如「生物、医学信息分析」是一个整体）
  const pageRes = t.research
    .map((s) => s.replace(/\s+/g, '').trim())
    .filter((s) => s.length >= 2 && s.length <= 30 && !BAD_RESEARCH.test(s));
  const pdfRes = normalizeResearch(p?.research || '');

  // 官网个人主页是最新数据，优先；PDF 名录是较早的静态文件，仅作兜底
  // （PDF 中方向与职称都可能已过时，例如赵启军主页为教授，PDF 仍标副高）
  let research;
  let researchSource;
  if (pageRes.length) {
    research = pageRes;
    researchSource = 'homepage';
    fromPage++;
  } else if (pdfRes.length) {
    research = pdfRes;
    researchSource = 'pdf';
    fromPdf++;
  } else {
    research = [];
    researchSource = '';
    stillEmpty++;
  }

  return {
    ...t,
    research,
    title: t.title || p?.title || '',
    email: t.email || p?.pdfEmail || '',
    honors: p?.note || '',
    tutorTitle: p?.title || '',
    source: 'homepage',
    researchSource,
  };
});

// 补入名录里有、但学院主页列表未收录的导师（多为资深博导，无个人主页）
const known = new Set(raw.map((t) => t.name));
const pdfOnly = pdf
  .filter((p) => !known.has(p.name))
  .filter((p) => !BAD_RESEARCH.test(p.name))
  .map((p) => ({
    id: null,
    name: p.name,
    slug: '',
    avatar: '',
    homepage: '',
    college: '计算机学院（软件学院）',
    rank: '',
    title: p.title,
    department: '',
    degree: '',
    hiredAt: '',
    office: '',
    status: '',
    email: p.pdfEmail || '',
    research: normalizeResearch(p.research),
    bio: '',
    honors: p.note || '',
    tutorTitle: p.title,
    source: 'pdf-only',
    researchSource: normalizeResearch(p.research).length ? 'pdf' : '',
  }));

const out = [...merged, ...pdfOnly].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
const cleaned = out.map(({ hasCustomAvatar, ...rest }) => rest);
writeFileSync('data/teachers.json', JSON.stringify(cleaned, null, 2), 'utf8');

const pct = (n) => `${((n / cleaned.length) * 100).toFixed(1)}%`;
const withRes = cleaned.filter((t) => t.research.length).length;
console.log(`总人数 ${cleaned.length}（有个人主页 ${merged.length} + 仅名录 ${pdfOnly.length}）`);
console.log(`研究方向覆盖 ${withRes} (${pct(withRes)}) — PDF源 ${fromPdf} / 主页源 ${fromPage} / 空 ${stillEmpty}`);
console.log(`职称覆盖 ${cleaned.filter((t) => t.title).length} (${pct(cleaned.filter((t) => t.title).length)})`);
console.log(`邮箱覆盖 ${cleaned.filter((t) => t.email).length} (${pct(cleaned.filter((t) => t.email).length)})`);
console.log(`\n仅名录的导师: ${pdfOnly.map((t) => t.name).join(' ')}`);
