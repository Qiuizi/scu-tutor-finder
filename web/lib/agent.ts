import type { Teacher, Notice } from './types';

/** 提取问句里命中的研究方向标签，用于粗排 */
function matchedTags(query: string, allTags: string[]) {
  return allTags.filter((t) => t.length >= 2 && query.includes(t));
}

/**
 * 关键词打分检索：不引向量库。
 * 188 人规模下，姓名 > 方向标签 > 简介 的分层打分已足够准，且零依赖、可解释。
 */
export function retrieve(query: string, teachers: Teacher[], limit = 8) {
  const q = query.trim();
  if (!q) return [];

  const allTags = [...new Set(teachers.flatMap((t) => t.research))];
  const tags = matchedTags(q, allTags);

  const scored = teachers.map((t) => {
    let score = 0;
    // 1. 姓名直击（最高权重）
    if (q.includes(t.name)) score += 120;
    // 2. 方向标签命中
    for (const tg of tags) {
      if (t.research.some((r) => r.includes(tg) || tg.includes(r))) score += 30;
    }
    // 3. 方向名与问句的直接子串匹配（覆盖标签未命中但方向文本相关的情况）
    for (const r of t.research) {
      if (r.length >= 2 && q.includes(r)) score += 25;
      else if (r.length >= 3 && r.split('').some((ch) => q.includes(ch) && q.includes(r.slice(0, 2)))) score += 4;
    }
    // 4. 职称/头衔补充（问「博导」这类）
    if (/博导|博士生导师/.test(q) && t.tutorTitle) score += 8;
    // 5. 简介弱匹配
    if (t.bio) {
      for (const kw of q.split(/[\s,，。？?、]+/).filter((w) => w.length >= 2)) {
        if (t.bio.includes(kw)) score += 3;
      }
    }
    return { t, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.t);
}

/** 把教师资料压缩成给模型看的紧凑文本 */
export function teacherToContext(t: Teacher) {
  const parts = [`【${t.name}】${t.title || t.rank || '职称未公开'}${t.tutorTitle ? `（${t.tutorTitle}）` : ''}`];
  if (t.research.length) parts.push(`研究方向：${t.research.join('、')}`);
  if (t.email) parts.push(`邮箱：${t.email}`);
  if (t.office) parts.push(`办公地点：${t.office}`);
  if (t.honors) parts.push(`荣誉/备注：${t.honors}`);
  if (t.homepage) parts.push(`主页：${t.homepage}`);
  if (t.bio) parts.push(`简介：${t.bio.slice(0, 260)}`);
  return parts.join('\n');
}

export function buildSystemPrompt(teachers: Teacher[], notices: Notice[], meta: { updatedAt: string }) {
  return `你是「川大导师速查」的检索助手，服务对象是四川大学计算机学院（软件学院）的学生，帮他们了解本院导师、选导师、找研究方向。

规则：
1. 只依据下面提供的资料回答，不要编造导师信息、论文、经费或联系方式。
2. 资料里没有的，直接说「官网未公开」或「资料中未收录」，并建议去看个人主页。
3. 推荐导师时给出：姓名、职称、研究方向、邮箱（如有），并说明推荐理由。
4. 涉及考研/保研/硕博连读时，提醒以学院官网最新通知为准。
5. 回答简洁，用中文，不用客套话。
6. 数据更新于 ${meta.updatedAt}，目前库内有 ${teachers.length} 位教师、${notices.length} 条学院动态。

如果用户问的是通知/动态，参考「学院动态」部分。如果问的是「谁做什么方向」，参考「导师资料」部分。`;
}

/** 拼装本轮上下文：检索到的教师 + 最近通知 */
export function buildUserContext(query: string, teachers: Teacher[], notices: Notice[]) {
  const hits = retrieve(query, teachers, 8);
  const recent = notices.slice(0, 8);

  const teacherBlock = hits.length
    ? hits.map(teacherToContext).join('\n\n')
    : '（未检索到匹配的导师，可能库内无此方向或该导师资料未公开）';

  const noticeBlock = recent.length
    ? recent.map((n) => `- ${n.date || '近期'} [${n.type}] ${n.title}`).join('\n')
    : '（暂无动态）';

  return `## 导师资料（按用户问题检索）\n${teacherBlock}\n\n## 学院动态（最近）\n${noticeBlock}`;
}
