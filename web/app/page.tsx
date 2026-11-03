import { getData, getResearchTags } from '@/lib/data';
import TeacherExplorer from '@/components/teacher-explorer';
import AgentPanel from '@/components/agent-panel';
import NoticeList from '@/components/notice-list';

export default function Home() {
  const { teachers, notices, meta } = getData();
  const tags = getResearchTags(teachers, 22);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="glow-top">
        <header className="border-b border-line-soft">
          <div className="mx-auto max-w-6xl px-5 py-7">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-[22px] font-semibold tracking-tight">川大导师速查</h1>
              <span className="text-[13px] text-muted">
                计算机学院（软件学院）· 研究方向与成果检索
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-dim">
              <Stat label="教师" value={meta.totalTeachers} />
              <Stat label="研究方向可查" value={meta.withResearch} />
              <Stat label="研究生导师" value={meta.tutors} />
              <Stat label="邮箱公开" value={meta.withEmail} />
              <Stat label="学院动态" value={meta.totalNotices} />
              <span className="ml-auto text-muted">数据更新于 {meta.updatedAt}</span>
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_310px]">
          <TeacherExplorer teachers={teachers} tags={tags} />
          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <NoticeList notices={notices} />
          </aside>
        </div>
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-6xl px-5 py-5 text-[12px] leading-relaxed text-muted">
          数据来源：四川大学教师个人主页系统、计算机学院（软件学院）研究生导师名录、人工智能学院官网。
          本工具仅做公开信息聚合，权威信息以学院官网为准；部分教师未在主页公开研究方向，故显示为空。
        </div>
      </footer>

      <AgentPanel />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[15px] font-semibold text-ink tabular-nums">{value}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}
