import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Teacher, Notice, Meta } from './types';

// 数据放在 public/data，构建时可静态读取（服务端渲染），运行时客户端也能直接 fetch
const DATA_DIR = path.join(process.cwd(), 'public', 'data');

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

let cache: { teachers: Teacher[]; notices: Notice[]; meta: Meta } | null = null;

export function getData() {
  if (cache) return cache;
  const teachers = readJson<Teacher[]>('teachers.json', []);
  const notices = readJson<Notice[]>('notices.json', []);
  const meta = readJson<Meta>('meta.json', {
    updatedAt: '',
    totalTeachers: teachers.length,
    withResearch: teachers.filter((t) => t.research.length).length,
    tutors: teachers.filter((t) => t.tutorTitle).length,
    withEmail: teachers.filter((t) => t.email).length,
    totalNotices: notices.length,
    sources: [],
  });
  cache = { teachers, notices, meta };
  return cache;
}

/** 方向标签聚合：返回按出现次数降序的方向列表 */
export function getResearchTags(teachers: Teacher[], limit = 24) {
  const freq = new Map<string, number>();
  for (const t of teachers) for (const r of t.research) freq.set(r, (freq.get(r) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
