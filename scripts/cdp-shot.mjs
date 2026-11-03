// 用 CDP 驱动无头浏览器：加载页面 -> 执行交互脚本 -> 截图
// 用于验证需要点击才能看到的界面（如助手面板），无需额外依赖
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, outFile, ...jsSteps] = process.argv.slice(2);
const PORT = 9333;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

mkdirSync(path.dirname(outFile), { recursive: true });

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    // 访问外网（如线上 Pages）时需要走系统代理；本地预览则禁用
    ...(process.env.CDP_USE_PROXY ? [] : ['--no-proxy-server']),
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=' + path.resolve('.tmp', 'cdp-profile'),
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`, { headers: { Host: `127.0.0.1:${PORT}` } });
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* 还没起来 */
    }
    await sleep(300);
  }
  throw new Error('无法连接 Chrome 调试端口');
}

const wsUrl = await getTarget();
const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

await new Promise((r) => ws.addEventListener('open', r, { once: true }));

const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url });
await sleep(3500);

for (const step of jsSteps) {
  const res = await send('Runtime.evaluate', {
    expression: step,
    awaitPromise: true,
    returnByValue: true,
  });
  const val = res.result?.result?.value;
  if (val !== undefined) console.log('JS 结果:', typeof val === 'string' ? val.slice(0, 400) : JSON.stringify(val).slice(0, 400));
  await sleep(1500);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'));
console.log('截图已保存:', outFile);

ws.close();
chrome.kill();
process.exit(0);
