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

const achieveCount = (t: Teacher) => (t.papers?.length || 0) + (t.projects?.length || 0);

/** 分享链接标识：有个人主页用 slug，仅名录者退化为姓名 */
const keyOf = (t: Teacher) => t.slug || t.name;

type SortKey = 'rank' | 'name' | 'output';
type View = 'grid' | 'list';

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
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [view, setView] = useState<View>('grid');
  const [selected, setSelected] = useState<Teacher | null>(null);
  const hydrated = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // 键盘：/ 聚焦搜索，Esc 清空或关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const editing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === '/' && !editing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && !selected && document.activeElement === searchRef.current) {
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = teachers.filter((t) => {
      if (onlyTutor && !t.tutorTitle) return false;
      if (rank !== 'all') {
        const key = t.tutorTitle || t.rank || '';
        if (!key.includes(rank)) return false;
      }
      if (activeTag && !t.research.some((r) => r.includes(activeTag) || activeTag.includes(r))) return false;
      if (!q) return true;
      const hay = [
        t.name,
        t.title,
        t.rank,
        t.email,
        t.office,
        ...t.research,
        t.bio,
        t.honors,
        ...(t.papers || []).map((p) => p.title),
        ...(t.projects || []).map((p) => p.title),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    return filtered.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'zh');
      if (sortKey === 'output') {
        const d = achieveCount(b) - achieveCount(a);
        if (d !== 0) return d;
      }
      const d = rankWeight(a) - rankWeight(b);
      return d !== 0 ? d : a.name.localeCompare(b.name, 'zh');
    });
  }, [teachers, query, rank, onlyTutor, activeTag, sortKey]);

  const reset = () => {
    setQuery('');
    setRank('all');
    setOnlyTutor(false);
    setActiveTag('');
  };

  const dirty = query || rank !== 'all' || onlyTutor || activeTag;
  const q = query.trim();

  return (
    <section>
      {/* 搜索与筛选：吸顶，滚动时始终可操作 */}
      <div className="sticky top-0 z-30 bg-bg/90 pb-3 pt-1 backdrop-blur-md">
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
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜姓名、研究方向、论文关键词…（如 计算机视觉 / 赵启军 / 人脸识别）"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-24 text-[14px] text-ink shadow-[var(--shadow-sm)] placeholder:text-muted/90 outline-none transition focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
        />
        {query ? (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="清空"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
            /
          </kbd>
        )}
      </div>

      {/* 筛选条 */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)]">
          {(['all', '正高', '副高', '中级'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRank(r)}
              className={`chip rounded-md px-2.5 py-1 text-[12.5px] ${
                rank === r ? 'bg-accent-bg font-medium text-accent' : 'text-ink-dim hover:text-ink'
              }`}
            >
              {r === 'all' ? '全部职称' : r}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOnlyTutor((v) => !v)}
          className={`chip rounded-lg border px-2.5 py-1.5 text-[12.5px] ${
            onlyTutor
              ? 'border-accent/40 bg-accent-bg font-medium text-accent'
              : 'border-line bg-surface text-ink-dim shadow-[var(--shadow-sm)] hover:text-ink'
          }`}
        >
          仅看研究生导师
        </button>

        {dirty && (
          <button
            onClick={reset}
            className="text-[12.5px] text-muted underline-offset-2 hover:text-accent hover:underline"
          >
            清除筛选
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* 排序 */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="cursor-pointer rounded-lg border border-line bg-surface px-2 py-1.5 text-[12.5px] text-ink-dim shadow-[var(--shadow-sm)] outline-none transition hover:text-ink focus:border-accent/50"
          >
            <option value="rank">按职称排序</option>
            <option value="name">按姓名排序</option>
            <option value="output">按成果数量</option>
          </select>

          {/* 视图切换 */}
          <div className="flex rounded-lg border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)]">
            <button
              onClick={() => setView('grid')}
              aria-label="卡片视图"
              className={`chip rounded-md p-1.5 ${view === 'grid' ? 'bg-accent-bg text-accent' : 'text-muted hover:text-ink'}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="列表视图"
              className={`chip rounded-md p-1.5 ${view === 'list' ? 'bg-accent-bg text-accent' : 'text-muted hover:text-ink'}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <span key={list.length} className="animate-in-soft tnum font-mono text-[12.5px] text-muted">
            {list.length} 位
          </span>
        </div>
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
                title={`${t.count} 位教师`}
                className={`chip rounded-full border px-2.5 py-1 text-[12px] ${
                  on
                    ? 'border-accent/40 bg-accent-bg font-medium text-accent'
                    : 'border-line-soft bg-surface text-ink-dim hover:border-line hover:text-ink'
                }`}
              >
                {t.name}
                <span className="ml-1 tnum font-mono text-[10.5px] text-muted">{t.count}</span>
              </button>
            );
          })}
          {tags.length > 10 && (
            <button
              onClick={() => setShowAllTags((v) => !v)}
              className="chip rounded-full border border-transparent px-2.5 py-1 text-[12px] text-muted hover:text-accent"
            >
              {showAllTags ? '收起' : `+${tags.length - 10} 个方向`}
            </button>
          )}
        </div>
      )}
      </div>

      {/* 列表 */}
      {view === 'grid' ? (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t, i) => (
            <button
              key={keyOf(t)}
              onClick={() => setSelected(t)}
              style={{ animationDelay: `${Math.min(i, 14) * 16}ms` }}
              className="card animate-in-soft flex flex-col rounded-xl p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <Avatar teacher={t} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-ink">
                      <Highlight text={t.name} q={q} />
                    </span>
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
                    <span
                      key={r}
                      className="rounded bg-accent-bg px-2 py-0.5 text-[11.5px] font-medium text-accent"
                    >
                      <Highlight text={r} q={q} />
                    </span>
                  ))
                ) : (
                  <span className="text-[11.5px] text-muted">未公开研究方向</span>
                )}
                {t.research.length > 3 && (
                  <span className="text-[11.5px] text-muted">+{t.research.length - 3}</span>
                )}
              </div>

              <div className="mt-auto flex items-center gap-3 pt-3 text-[11.5px] text-muted">
                {t.email ? <span className="truncate">{t.email}</span> : <span>邮箱未公开</span>}
                {achieveCount(t) > 0 && (
                  <span className="ml-auto shrink-0 rounded bg-surface-2 px-1.5 py-0.5 tnum text-[10.5px]">
                    成果 {achieveCount(t)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[var(--shadow-sm)]">
          {list.map((t, i) => (
            <button
              key={keyOf(t)}
              onClick={() => setSelected(t)}
              style={{ animationDelay: `${Math.min(i, 20) * 10}ms` }}
              className={`animate-in-soft flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2 ${
                i ? 'border-t border-line-soft' : ''
              }`}
            >
              <Avatar teacher={t} size={32} />
              <span className="w-[72px] shrink-0 truncate text-[13.5px] font-medium text-ink">
                <Highlight text={t.name} q={q} />
              </span>
              <span className="w-[62px] shrink-0 text-[11.5px] text-muted">{displayTitle(t)}</span>
              <span className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                {t.research.slice(0, 3).map((r) => (
                  <span
                    key={r}
                    className="shrink-0 rounded bg-accent-bg px-1.5 py-0.5 text-[11px] text-accent"
                  >
                    {r}
                  </span>
                ))}
                {!t.research.length && <span className="text-[11.5px] text-muted">—</span>}
              </span>
              <span className="hidden w-[190px] shrink-0 truncate text-[11.5px] text-muted sm:block">
                {t.email}
              </span>
              <span className="w-[52px] shrink-0 text-right tnum text-[11px] text-muted">
                {achieveCount(t) ? `${achieveCount(t)} 项` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-surface/60 py-16 text-center">
          <p className="text-[14px] text-ink-dim">没有匹配的教师</p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {q ? `「${q}」可能是英文关键词或该教师未公开此信息，换个说法试试` : '换个条件，或点「清除筛选」'}
          </p>
          {dirty && (
            <button
              onClick={reset}
              className="mt-4 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink-dim transition hover:border-accent/40 hover:text-accent"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {selected && <TeacherDetail teacher={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

/** 关键词高亮 */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const target = q.toLowerCase();
  const i = lower.indexOf(target);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hit">{text.slice(i, i + target.length)}</mark>
      {text.slice(i + target.length)}
    </>
  );
}

function Avatar({ teacher, size = 44 }: { teacher: Teacher; size?: number }) {
  const [err, setErr] = useState(false);
  const showImg = teacher.avatar && !teacher.avatar.includes('defaultteacherimg') && !err;
  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={teacher.avatar}
        alt={teacher.name}
        onError={() => setErr(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-lg border border-line object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-gradient-to-br from-accent-bg to-white font-semibold text-accent"
      aria-hidden
    >
      {teacher.name.slice(0, 1)}
    </div>
  );
}
