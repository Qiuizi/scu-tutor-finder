// 抓取公共工具：带重试的请求、GBK 解码、HTML 清洗
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://faculty.scu.edu.cn';

/** 深睡眠，避免给校内站点造成压力 */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 带指数退避的 GET，返回已解码文本 */
export async function get(url, { retries = 3, timeout = 20000 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: BASE + '/', 'Accept-Language': 'zh-CN,zh;q=0.9' },
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return decode(buf, res.headers.get('content-type') || '');
    } catch (e) {
      lastErr = e;
      await sleep(600 * (i + 1) ** 2);
    }
  }
  throw new Error(`请求失败 ${url}: ${lastErr?.message}`);
}

/** 站点编码混杂：优先按 header/meta 判断，回退 UTF-8 -> GBK */
export function decode(buf, contentType = '') {
  const head = buf.subarray(0, 2000).toString('latin1');
  const isGbk =
    /charset=["']?(gb2312|gbk|gb18030)/i.test(contentType + head) ||
    (!/charset=["']?utf-8/i.test(contentType + head) && buf.includes(Buffer.from([0xd6, 0xd0]))); // "中" 的 GBK 编码
  const enc = isGbk ? 'gbk' : 'utf-8';
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

/** 去标签取纯文本，保留段落换行 */
export function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

/** 统一绝对地址 */
export const abs = (href) => (href?.startsWith('http') ? href : BASE + (href || ''));

export const DETAIL_BASE = BASE;
