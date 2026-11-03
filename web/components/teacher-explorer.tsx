'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Teacher } from '@/lib/types';
import TeacherDetail from './teacher-detail';

const RANK_ORDER: Record<string, number> = { 院士: 0, 正高: 1, 副高: 2, 中级: 3 };

/** 展示用职称：院士 > 具体职称（教授/副教授…）> 职称等级（正高/副高） */
function displayTitle(t: Teacher) {
  if (t.tutorTitle === '院士') return '院士';
  return t.title || t.rank || t.tutorTitle || '';
}

function rankWeight(t: Teacher) {
  if (t.tutorTitle === '院士') return 0;
  return RANK_ORDER[t.rank] ?? RANK_ORDER[t.tutorTitle] ?? 5;
}

/** 分享链接标识：有个人主页用 slug，仅名录者退化为姓名 */
const keyOf = (t: Teacher) => t.slug || t.name;

export default function TeacherExplorer({
  teachers,
  tags,
}: {
  teachers: Teacher[];
  tags: { name: string; count: number }[];
}) {
  const [query, setQuery] = useState('');
  const [rank, setRank] = useState<'all' | '正高' | '副高' | '中级'>('all');
  const [onlyTutor, setOnlyTutor] = useState(false);
  const [activeTag, setActiveTag] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [selected, setSelected] = useState<Teacher | null>(null);
  const hydrated = useRef(false);

  // 挂载后再读 ?t= 参数（不能在 useState 初始化里读 window，会导致 hydration 不匹配）
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const slug = new URLSearchParams(window.location.search).get('t');
    const hit = slug ? teachers.find((t) => keyOf(t) === slug) : null;
    if (hit) setSelected(hit);
  }, [teachers]);

  useEffect(() => {
    if (!hydrated.current) return;
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set('t', keyOf(selected));
    else url.searchParams.delete('t');
    window.history.replaceState(null, '', url.toString());
  }, [selected]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers
      .filter((t) => {
        if (onlyTutor && !t.tutorTitle) return false;
        if (rank !== 'all') {
          const key = t.tutorTitle || t.rank || '';
          if (!key.includes(rank)) return false;
        }
        if (activeTag && !t.research.some((r) => r.includes(activeTag) || activeTag.includes(r))) return false;
        if (!q) return true;
        const hay = [t.name, t.title, t.rank, t.email, t.office, ...t.research, t.bio, t.honors]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const d = rankWeight(a) - rankWeight(b);
        if (d !== 0) return d;
        return a.name.localeCompare(b.name, 'zh');
      });
  }, [teachers, query, rank, onlyTutor, activeTag]);

  const reset = () => {
    setQuery('');
    setRank('all');
    setOnlyTutor(false);
    setActiveTag('');
  };

  const dirty = query || rank !== 'all' || onlyTutor || activeTag;

  return (
    <section>
      {/* 搜索 */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜姓名、研究方向、关键词…（如 计算机视觉 / 张蕾 / 数据库）"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-10 text-[14px] text-ink placeholder:text-muted/80 outline-none transition focus:border-accent/60 focus:bg-surface-2"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
            aria-label="清空"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* 筛选 */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {(['all', '正高', '副高', '中级'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRank(r)}
              className={`rounded-md px-2.5 py-1 text-[12.5px] transition ${
                rank === r ? 'bg-accent/15 text-accent-soft' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {r === 'all' ? '全部职称' : r}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOnlyTutor((v) => !v)}
          className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] transition ${
            onlyTutor
              ? 'border-accent/50 bg-accent/15 text-accent-soft'
              : 'border-line bg-surface text-ink-dim hover:text-ink'
          }`}
        >
          仅看研究生导师
        </button>

        {dirty && (
          <button onClick={reset} className="ml-1 text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline">
            清除筛选
          </button>
        )}

        <span className="ml-auto font-mono text-[12.5px] tabular-nums text-muted">{list.length} 位</span>
      </div>

      {/* 方向标签 */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(showAllTags ? tags : tags.slice(0, 10)).map((t) => {
            const on = activeTag === t.name;
            return (
              <button
                key={t.name}
                onClick={() => setActiveTag(on ? '' : t.name)}
                className={`rounded-full border px-2.5 py-1 text-[12px] transition ${
                  on
                    ? 'border-accent/50 bg-accent/15 text-accent-soft'
                    : 'border-line-soft bg-surface text-ink-dim hover:border-line hover:text-ink'
                }`}
              >
                {t.name}
                <span className="ml-1 font-mono text-[10.5px] text-muted">{t.count}</span>
              </button>
            );
          })}
          {tags.length > 10 && (
            <button
              onClick={() => setShowAllTags((v) => !v)}
              className="rounded-full border border-transparent px-2.5 py-1 text-[12px] text-muted transition hover:text-ink"
            >
              {showAllTags ? '收起' : `+${tags.length - 10} 个方向`}
            </button>
          )}
        </div>
      )}

      {/* 列表 */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t, i) => (
          <button
            key={t.slug || t.name}
            onClick={() => setSelected(t)}
            style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
            className="card-lift animate-in-soft flex flex-col rounded-xl border border-line-soft bg-surface p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <Avatar teacher={t} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium text-ink">{t.name}</span>
                  {displayTitle(t) && (
                    <span className="shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-dim">
                      {displayTitle(t)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted">
                  {t.office || (t.tutorTitle ? '研究生导师' : '—')}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.research.length ? (
                t.research.slice(0, 3).map((r) => (
                  <span key={r} className="rounded bg-accent/10 px-2 py-0.5 text-[11.5px] text-accent-soft">
                    {r}
                  </span>
                ))
              ) : (
                <span className="text-[11.5px] text-muted">未公开研究方向</span>
              )}
              {t.research.length > 3 && (
                <span className="text-[11.5px] text-muted">+{t.research.length - 3}</span>
              )}
            </div>

            <div className="mt-auto pt-3 text-[11.5px] text-muted">
              {t.email ? <span className="truncate">{t.email}</span> : <span>邮箱未公开</span>}
            </div>
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line py-14 text-center">
          <p className="text-[14px] text-ink-dim">没有匹配的教师</p>
          <p className="mt-1.5 text-[12.5px] text-muted">换个关键词，或点「清除筛选」看全部</p>
        </div>
      )}

      {selected && <TeacherDetail teacher={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function Avatar({ teacher }: { teacher: Teacher }) {
  const [err, setErr] = useState(false);
  const showImg = teacher.avatar && !teacher.avatar.includes('defaultteacherimg') && !err;
  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={teacher.avatar}
        alt={teacher.name}
        onError={() => setErr(true)}
        className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-gradient-to-br from-accent/20 to-accent/5 text-[15px] font-medium text-accent-soft"
      aria-hidden
    >
      {teacher.name.slice(0, 1)}
    </div>
  );
}
