'use client';

import { useEffect, useState } from 'react';
import type { Teacher, AchieveItem } from '@/lib/types';

export default function TeacherDetail({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const copyEmail = async () => {
    if (!teacher.email) return;
    try {
      await navigator.clipboard.writeText(teacher.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#17171a]/25 backdrop-blur-[3px]" onClick={onClose} />

      <div className="animate-slide-in relative h-full w-full max-w-[520px] overflow-y-auto border-l border-line bg-surface shadow-[var(--shadow-lg)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-surface/95 px-5 py-3.5 backdrop-blur">
          <span className="text-[12.5px] text-muted">教师详情</span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="关闭"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {/* 头部 */}
          <div className="flex items-start gap-4">
            {teacher.avatar && !teacher.avatar.includes('defaultteacherimg') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teacher.avatar}
                alt={teacher.name}
                className="h-16 w-16 rounded-xl border border-line object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent/15 bg-gradient-to-br from-accent-bg to-white text-xl font-semibold text-accent">
                {teacher.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-semibold tracking-tight text-ink">{teacher.name}</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {teacher.tutorTitle === '院士' ? (
                  <Badge accent>院士</Badge>
                ) : teacher.title ? (
                  <Badge>{teacher.title}</Badge>
                ) : (
                  teacher.rank && <Badge>{teacher.rank}</Badge>
                )}
                {teacher.tutorTitle && teacher.tutorTitle !== '院士' && <Badge accent>研究生导师</Badge>}
                {teacher.status && <Badge>{teacher.status}</Badge>}
              </div>
            </div>
          </div>

          {/* 研究方向 */}
          <Section title="研究方向">
            {teacher.research.length ? (
              <div className="flex flex-wrap gap-1.5">
                {teacher.research.map((r) => (
                  <span
                    key={r}
                    className="rounded-md border border-accent/20 bg-accent-bg px-2.5 py-1 text-[12.5px] font-medium text-accent"
                  >
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                该教师未在个人主页公开研究方向。可前往其主页或直接邮件咨询。
              </p>
            )}
          </Section>

          {/* 联系方式 */}
          <Section title="联系方式">
            <div className="space-y-2">
              {teacher.email ? (
                <button
                  onClick={copyEmail}
                  className="group flex w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-left transition hover:border-accent/40 hover:bg-accent-bg/40"
                >
                  <span className="text-[11px] text-muted">邮箱</span>
                  <span className="flex-1 truncate font-mono text-[13px] text-ink">{teacher.email}</span>
                  <span className="text-[11px] font-medium text-accent opacity-0 transition group-hover:opacity-100">
                    {copied ? '已复制' : '复制'}
                  </span>
                </button>
              ) : (
                <p className="text-[13px] text-muted">邮箱未公开</p>
              )}

              {teacher.office && <Row label="办公地点" value={teacher.office} />}
              {teacher.department && <Row label="所在单位" value={teacher.department} />}
              {teacher.degree && <Row label="学历" value={teacher.degree} />}
              {teacher.hiredAt && <Row label="入职时间" value={teacher.hiredAt} />}
            </div>
          </Section>

          {/* 荣誉 */}
          {teacher.honors && (
            <Section title="荣誉 / 人才计划">
              <p className="text-[13px] leading-relaxed text-ink-dim">{teacher.honors}</p>
            </Section>
          )}

          {/* 论文成果 */}
          {!!teacher.papers?.length && (
            <AchieveSection title="论文成果" items={teacher.papers} preview={5} />
          )}

          {/* 科研项目 */}
          {!!teacher.projects?.length && (
            <AchieveSection title="科研项目" items={teacher.projects} preview={4} />
          )}

          {/* 简介 */}
          {teacher.bio && (
            <Section title="个人简介">
              <Bio text={teacher.bio} />
            </Section>
          )}

          {/* 外链 */}
          <div className="mt-6 space-y-2 pb-8">
            {teacher.homepage ? (
              <a
                href={teacher.homepage}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-medium text-white shadow-[0_4px_14px_rgba(79,70,229,0.25)] transition hover:bg-[#4338ca] hover:shadow-[0_6px_20px_rgba(79,70,229,0.32)]"
              >
                打开川大官方个人主页
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ) : (
              <div className="rounded-lg border border-dashed border-line px-4 py-2.5 text-center text-[12.5px] text-muted">
                该教师无个人主页，信息来自学院研究生导师名录
              </div>
            )}

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`四川大学 ${teacher.name} 计算机`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13.5px] text-ink-dim transition hover:border-accent/40 hover:text-accent"
            >
              搜索其论文与成果
            </a>

            <p className="pt-2 text-center text-[11.5px] leading-relaxed text-muted">
              数据来源：{teacher.source === 'pdf-only' ? '学院研究生导师名录' : '川大教师个人主页系统'}
              {teacher.researchSource === 'pdf' && ' · 方向取自导师名录（主页未公开）'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 成果列表：默认只显示前 N 条，可展开 */
function AchieveSection({ title, items, preview }: { title: string; items: AchieveItem[]; preview: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, preview);

  return (
    <Section title={`${title}（${items.length}）`}>
      <ul className="space-y-1.5">
        {shown.map((it, i) => (
          <li key={it.url + i}>
            <a
              href={it.url}
              target="_blank"
              rel="noreferrer"
              className="group flex gap-2 rounded-lg border border-transparent px-2 py-1.5 transition hover:border-line hover:bg-surface-2"
            >
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent/50" />
              <span className="text-[12.5px] leading-[1.6] text-ink-dim group-hover:text-ink">
                {it.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {items.length > preview && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-[12px] font-medium text-accent transition hover:text-[#4338ca]"
        >
          {expanded ? '收起' : `展开全部 ${items.length} 条`}
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </Section>
  );
}

/** 长简介默认折叠，避免一屏放不下 */
function Bio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 320;
  return (
    <>
      <p className="whitespace-pre-line text-[13px] leading-[1.8] text-ink-dim">
        {long && !expanded ? `${text.slice(0, 320)}…` : text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-[12px] font-medium text-accent transition hover:text-[#4338ca]"
        >
          {expanded ? '收起' : '展开全文'}
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <span className="w-16 shrink-0 text-[11px] leading-[1.7] text-muted">{label}</span>
      <span className="flex-1 text-ink-dim">{value}</span>
    </div>
  );
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[11px] ${
        accent ? 'border-accent/25 bg-accent-bg font-medium text-accent' : 'border-line bg-surface-2 text-ink-dim'
      }`}
    >
      {children}
    </span>
  );
}
