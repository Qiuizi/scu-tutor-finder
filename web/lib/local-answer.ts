import { retrieve } from './agent';
import type { Teacher, Notice } from './types';

/** 通知类问题的关键词 */
const NOTICE_HINT = /通知|公告|动态|新闻|招生|硕博|夏令营|复试|调剂|宣讲|讲座|论坛/;

function teacherLine(t: Teacher) {
  const parts = [`${t.name}（${t.title || t.rank || '职称未公开'}）`];
  if (t.research.length) parts.push(`　方向：${t.research.join('、')}`);
  if (t.email) parts.push(`　邮箱：${t.email}`);
  if (t.office) parts.push(`　办公室：${t.office}`);
  return parts.join('\n');
}

/**
 * 纯前端问答：没有后端 / 没有 API Key 时使用。
 * 不编造内容，只做检索结果的整理与呈现——这是静态站能给出的最诚实回答。
 */
export function localAnswer(query: string, teachers: Teacher[], notices: Notice[]): string {
  const q = query.trim();

  // 通知类问题
  if (NOTICE_HINT.test(q)) {
    const rel = notices.slice(0, 6);
    if (!rel.length) return '目前库里没有学院动态数据。可以到学院官网 xwgg 栏目查看。';
    return [
      '最近的学院动态：',
      '',
      ...rel.map((n) => `- ${n.date || '近期'}｜${n.type}｜${n.title}`),
      '',
      '完整内容请点右侧「学院动态」里的链接打开官网原文。',
    ].join('\n');
  }

  const hits = retrieve(q, teachers, 6);

  if (!hits.length) {
    const tags = [...new Set(teachers.flatMap((t) => t.research))].slice(0, 8);
    return [
      '没有找到直接匹配的老师。',
      '',
      '可能原因：该方向在库里没有对应标签，或该老师未公开研究方向。',
      '',
      `可以先试试这些方向：${tags.join('、')}`,
      '',
      '也可以直接搜姓名，或到官网个人主页看最新信息。',
    ].join('\n');
  }

  return [
    `找到 ${hits.length} 位相关老师：`,
    '',
    ...hits.map((t, i) => `${i + 1}. ${teacherLine(t)}`),
    '',
    '点卡片可以看完整简介和官网链接。',
  ].join('\n');
}
