// 一键更新：重跑抓取流水线 -> 合并 -> 同步到前端 -> 生成元信息
// 用法：npm run update       （全量重抓）
//      npm run update:quick   （仅合并已有缓存，不重新请求）
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const QUICK = process.argv.includes('--quick');
const steps = QUICK
  ? ['04-merge.mjs', '06-notices.mjs']
  : ['01-roster.mjs', '02-detail.mjs', '03-pdf.mjs', '04-merge.mjs', '06-notices.mjs'];

// PDF 需要先落地到 .tmp，供 03 解析
const PDF_URL =
  'https://cs.scu.edu.cn/__local/E/04/F6/3D5577DF0BF2CEEC698B3A62BE4_861C0136_401786.pdf';
const PDF_PATH = '.tmp/tutor.pdf';

if (!QUICK && !existsSync(PDF_PATH)) {
  console.log('下载导师名录 PDF …');
  try {
    execFileSync(
      process.platform === 'win32' ? 'curl.exe' : 'curl',
      ['-s', '-m', '60', '-A', 'Mozilla/5.0', PDF_URL, '-o', PDF_PATH],
      { stdio: 'inherit' }
    );
  } catch {
    console.warn('PDF 下载失败，将沿用已有解析结果');
  }
}

for (const step of steps) {
  console.log(`\n━━━ ${step} ━━━`);
  try {
    execFileSync(process.execPath, [`crawler/${step}`], { stdio: 'inherit' });
  } catch (e) {
    console.error(`步骤 ${step} 失败：${e.message}`);
    if (!QUICK) process.exit(1);
  }
}

// 同步到前端静态数据目录
console.log('\n━━━ 同步数据到 web/data ━━━');
for (const f of ['teachers.json', 'notices.json']) {
  copyFileSync(`data/${f}`, `web/public/data/${f}`);
}

const ts = JSON.parse(readFileSync('data/teachers.json', 'utf8'));
const ns = JSON.parse(readFileSync('data/notices.json', 'utf8'));
const meta = {
  updatedAt: new Date().toISOString().slice(0, 10),
  totalTeachers: ts.length,
  withResearch: ts.filter((t) => t.research.length).length,
  tutors: ts.filter((t) => t.tutorTitle).length,
  withEmail: ts.filter((t) => t.email).length,
  totalNotices: ns.length,
  sources: [
    '四川大学教师个人主页系统 faculty.scu.edu.cn',
    '计算机学院(软件学院)研究生导师名录 PDF',
    '人工智能学院官网 ai.scu.edu.cn',
  ],
};
writeFileSync('web/public/data/meta.json', JSON.stringify(meta, null, 2), 'utf8');

console.log(`
更新完成 ${meta.updatedAt}
  教师 ${meta.totalTeachers} · 方向可查 ${meta.withResearch} · 导师 ${meta.tutors} · 邮箱 ${meta.withEmail}
  学院动态 ${meta.totalNotices} 条
`);
