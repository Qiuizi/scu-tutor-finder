// 本地预览静态产物（模拟 GitHub Pages，无任何后端）
const { createServer } = await import('node:http').then((m) => ({ createServer: m.createServer }));
const { readFile } = await import('node:fs/promises');
const path = await import('node:path');

const ROOT = path.resolve(process.cwd(), 'web', 'out');
const PORT = Number(process.argv[2] || 4000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const data = await readFile(path.join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('404');
    }
  }
}).listen(PORT, () => console.log(`静态预览（无后端）: http://localhost:${PORT}`));
