import { NextRequest } from 'next/server';
import { getData } from '@/lib/data';
import { buildSystemPrompt, buildUserContext } from '@/lib/agent';

// 兼容任意 OpenAI 格式服务（DeepSeek / 通义 / Moonshot / OpenAI / 本地 Ollama）
const BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1';
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const API_KEY = process.env.LLM_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return Response.json(
      {
        error: 'missing_api_key',
        message: '尚未配置模型密钥。请在 web/.env.local 中填写 LLM_API_KEY 后重启服务。',
      },
      { status: 400 }
    );
  }

  const { messages } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  if (!lastUser.trim()) return Response.json({ error: 'empty_query' }, { status: 400 });

  const { teachers, notices, meta } = getData();
  const context = buildUserContext(lastUser, teachers, notices);

  const upstream = await fetch(`${BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.3,
      messages: [
        { role: 'system', content: `${buildSystemPrompt(teachers, notices, meta)}\n\n${context}` },
        ...messages.slice(-6),
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return Response.json(
      { error: 'upstream_error', message: `模型服务返回 ${upstream.status}`, detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  // 原样透传 SSE 流，前端逐字渲染
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
