import { getData, getResearchTags } from '@/lib/data';
import TeacherExplorer from '@/components/teacher-explorer';
import AgentPanel from '@/components/agent-panel';
import NoticeList from '@/components/notice-list';
import { REPO_LABEL, REPO_URL, SITE_NAME, SITE_TAGLINE } from '@/lib/site';

const STEPS = [
  {
    n: '01',
    title: '搜索',
    body: '在检索入口输入姓名、研究方向或论文关键词。按 / 可随时聚焦搜索框。',
  },
  {
    n: '02',
    title: '筛选',
    body: '用职称、「仅看研究生导师」和方向标签缩小范围，并可切换排序与视图。',
  },
  {
    n: '03',
    title: '查看',
    body: '点开卡片看简介、公开邮箱和官方主页。右下角助手只根据本库资料回答。',
  },
];

export default function Home() {
  const { teachers, notices, meta } = getData();
  const tags = getResearchTags(teachers, 22);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="glow-top">
        <header>
          <div className="mx-auto max-w-7xl px-5 pb-7 pt-6 sm:pt-8">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="text-[12px] font-medium tracking-wide text-accent">{SITE_TAGLINE}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted">
                  数据更新于 {meta.updatedAt}
                </span>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink shadow-[var(--shadow-sm)] transition hover:border-accent/40 hover:text-accent"
                >
                  <GitHubMark />
                  源码
                  <span className="hidden font-normal text-muted sm:inline">{REPO_LABEL}</span>
                </a>
              </div>
            </div>

            <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
              {SITE_NAME}
            </h1>
            <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-dim">
              把四川大学计算机学院（软件学院）分散在官网的公开教师名录收成一处。按研究方向、职称和姓名查找，查看联系方式，并跳到官方主页。
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-dim sm:hidden">
              在下方检索入口搜索姓名或方向，用职称和标签筛选，点开卡片查看联系方式与官方主页。
            </p>

            <ol className="mt-5 hidden gap-2 sm:grid sm:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="rounded-xl border border-line-soft bg-surface/80 px-3.5 py-3 shadow-[var(--shadow-sm)]"
                >
                  <p className="text-[11px] font-medium tracking-wide text-accent">
                    {step.n} {step.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-dim">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href="#teacher-search"
                className="inline-flex items-center rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-[#4338ca]"
              >
                开始检索
              </a>
              <p className="hidden text-[12.5px] leading-relaxed text-muted sm:block">
                打开页面即可检索，无需安装。本地运行与可选的模型问答见{' '}
                <a
                  href={`${REPO_URL}#本地运行`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-dim underline decoration-line underline-offset-2 transition hover:text-accent"
                >
                  仓库运行说明
                </a>
                。
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2.5 text-[13px] text-ink-dim">
              <Stat label="教师" value={meta.totalTeachers} />
              <Stat label="方向可查" value={meta.withResearch} />
              <Stat label="研究生导师" value={meta.tutors} />
              <Stat label="邮箱公开" value={meta.withEmail} />
              <Stat label="有成果记录" value={meta.withPapers ?? 0} />
              <Stat label="学院动态" value={meta.totalNotices} />
            </div>
          </div>
        </header>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-line to-transparent" />
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_310px]">
          <TeacherExplorer teachers={teachers} tags={tags} />
          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <NoticeList notices={notices} />
          </aside>
        </div>
      </main>

      <footer className="mt-6 border-t border-line-soft bg-surface/60">
        <div className="mx-auto max-w-7xl px-5 py-6 text-[12px] leading-relaxed text-muted">
          <p>
            数据来源：四川大学教师个人主页系统、计算机学院（软件学院）研究生导师名录、人工智能学院官网。
          </p>
          <p className="mt-1">
            本工具仅聚合公开教师名录，不做评价、不打分；权威信息以学院官网为准。部分教师未在主页公开研究方向或成果，故显示为空。
          </p>
          <p className="mt-2">
            源码与本地运行：
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mx-1 text-ink-dim underline decoration-line underline-offset-2 transition hover:text-accent"
            >
              {REPO_LABEL}
            </a>
            · 维护者 Qiuizi
          </p>
        </div>
      </footer>

      <AgentPanel />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="tnum font-mono text-[16px] font-semibold text-ink">{value}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

function GitHubMark() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.68 7.68 0 0 1 8 3.87c.68.003 1.36.092 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
