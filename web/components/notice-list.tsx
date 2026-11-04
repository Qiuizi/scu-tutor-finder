import type { Notice } from '@/lib/types';

const TYPE_STYLE: Record<string, string> = {
  通知公告: 'text-amber-700 bg-amber-50 border-amber-200',
  新闻动态: 'text-sky-700 bg-sky-50 border-sky-200',
  科研成果: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  学术活动: 'text-violet-700 bg-violet-50 border-violet-200',
  数智菁英: 'text-rose-700 bg-rose-50 border-rose-200',
};

export default function NoticeList({ notices }: { notices: Notice[] }) {
  if (!notices.length) {
    return (
      <div className="rounded-xl border border-line-soft bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-[13px] font-semibold text-ink">学院动态</h2>
        <p className="mt-2 text-[12.5px] text-muted">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <h2 className="text-[13px] font-semibold text-ink">学院动态</h2>
        <span className="tnum font-mono text-[11.5px] text-muted">{notices.length}</span>
      </div>

      <ul className="divide-y divide-line-soft">
        {notices.slice(0, 12).map((n) => (
          <li key={n.id}>
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="group block px-4 py-2.5 transition hover:bg-surface-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10.5px] font-medium ${
                    TYPE_STYLE[n.type] || 'border-line bg-surface-2 text-ink-dim'
                  }`}
                >
                  {n.type}
                </span>
                {n.date && <span className="tnum font-mono text-[10.5px] text-muted">{n.date}</span>}
              </div>
              <p className="clamp-2 mt-1 text-[12.5px] leading-[1.55] text-ink-dim transition group-hover:text-accent">
                {n.title}
              </p>
            </a>
          </li>
        ))}
      </ul>

      <div className="border-t border-line-soft px-4 py-2.5">
        <a
          href="https://ai.scu.edu.cn/xwgg/tzgg.htm"
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-muted transition hover:text-accent"
        >
          查看学院全部通知 →
        </a>
      </div>
    </div>
  );
}
