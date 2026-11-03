// 静态导出构建：用于 GitHub Pages
// Next.js 的 output: 'export' 不支持 API Route，构建期间把它临时移出 app 目录
import { renameSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const WEB = path.join(process.cwd(), 'web');
const API_DIR = path.join(WEB, 'app', 'api');
const HOLD_DIR = path.join(WEB, '.api-hold');
const OUT_DIR = path.join(WEB, 'out');

let moved = false;
try {
  if (existsSync(API_DIR)) {
    renameSync(API_DIR, HOLD_DIR);
    moved = true;
    console.log('已临时移出 app/api（静态导出不支持 API Route）');
  }

  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  // 清掉增量缓存：上次构建生成的路由类型会引用已被移走的 API 路由
  const NEXT_DIR = path.join(WEB, '.next');
  if (existsSync(NEXT_DIR)) rmSync(NEXT_DIR, { recursive: true, force: true });

  console.log('开始静态构建…');
  execSync('npx next build', {
    stdio: 'inherit',
    cwd: WEB,
    env: { ...process.env, STATIC_EXPORT: '1' },
  });

  console.log('\n静态站点已生成：web/out');
} finally {
  if (moved && existsSync(HOLD_DIR)) {
    renameSync(HOLD_DIR, API_DIR);
    console.log('已恢复 app/api');
  }
}
