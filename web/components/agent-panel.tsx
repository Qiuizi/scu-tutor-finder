'use client';

import { useEffect, useRef, useState } from 'react';
import { localAnswer } from '@/lib/local-answer';
import type { Teacher, Notice } from '@/lib/types';

type Msg = { role: 'user' | 'assistant'; content: string };
type Mode = 'unknown' | 'ai' | 'local';

// 部署在子路径时（GitHub Pages 项目页），public 资源也要带前缀
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SUGGESTIONS = [
  '谁在做计算机视觉？',
  '有哪些研究机器智能的博导？',
  '推荐做数据库方向的导师',
  '最近学院有什么研究生相关通知？',
];

export default function AgentPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('unknown');
  const [hint, setHint] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef<{ teachers: Teacher[]; notices: Notice[] } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  /** 懒加载本库数据，只在第一次提问时拉取 */
  async function getData() {
    if (dataRef.current) return dataRef.current;
    const [teachers, notices] = await Promise.all([
      fetch(`${BASE}/data/teachers.json`).then((r) => r.json()),
      fetch(`${BASE}/data/notices.json`)
        .then((r) => r.json())
        .catch(() => []),
    ]);
    dataRef.current = { teachers: teachers as Teacher[], notices: notices as Notice[] };
    return dataRef.current;
  }

  /** 本地检索回答（无后端 / 无 Key 时的兜底） */
  async function answerLocally(q: string) {
    const { teachers, notices } = await getData();
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: localAnswer(q, teachers, notices) },
    ]);
    setMode('local');
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    setHint('');
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });

      const isStream = res.ok && (res.headers.get('content-type') || '').includes('text/event-stream');

      // 没有后端（静态站）或没配 Key（400）时，退回本地检索
      if (!isStream) {
        await answerLocally(q);
        return;
      }

      setMode('ai');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      setMessages([...next, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content || '';
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch {
            /* 忽略心跳等非 JSON 行 */
          }
        }
      }
    } catch {
      // 网络异常同样退回本地检索，保证功能可用
      try {
        await answerLocally(q);
      } catch {
        setHint('数据加载失败，请刷新页面重试');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-[13.5px] font-medium shadow-lg shadow-black/40 transition ${
          open ? 'bg-surface-3 text-ink' : 'bg-accent text-white hover:bg-[#4f46e5]'
        }`}
      >
        {open ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              d="M12 3a7 7 0 0 0-7 7c0 1.6.5 3 1.4 4.2L5 19l4.9-1.3c.7.2 1.4.3 2.1.3a7 7 0 0 0 0-14Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {open ? '收起' : '问问导师库'}
      </button>

      {open && (
        <div className="animate-in-soft fixed bottom-[74px] right-5 z-50 flex h-[540px] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[13px] font-medium">导师库助手</span>
            <span className="ml-auto text-[11px] text-muted">
              {mode === 'ai' ? 'AI 增强' : mode === 'local' ? '本地检索' : '基于本库资料'}
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-ink-dim">
                  我可以按研究方向找导师、查他们的职称与邮箱、看学院最新通知。
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-left text-[12.5px] text-ink-dim transition hover:border-accent/40 hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] leading-[1.7] ${
                    m.role === 'user'
                      ? 'bg-accent text-white'
                      : 'border border-line bg-surface-2 text-ink-dim'
                  }`}
                >
                  {m.content || (loading ? <span className="caret" /> : null)}
                </div>
              </div>
            ))}

            {hint && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200/90">
                {hint}
              </div>
            )}

            {mode === 'local' && messages.length > 0 && (
              <p className="pt-1 text-center text-[11px] leading-relaxed text-muted">
                当前为本地检索模式：直接匹配库内数据，不做推测。配置模型后可开启自然语言问答。
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-line-soft p-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问点什么，例如：做 NLP 的副教授有谁"
                disabled={loading}
                className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink placeholder:text-muted/80 outline-none transition focus:border-accent/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? '…' : '发送'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
