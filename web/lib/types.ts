export type Teacher = {
  id: number | null;
  name: string;
  slug: string;
  avatar: string;
  homepage: string;
  college: string;
  rank: string;        // 正高 / 副高 / 中级
  title: string;       // 教授 / 副教授 / 讲师
  department: string;
  degree: string;
  hiredAt: string;
  office: string;
  status: string;
  email: string;
  research: string[];
  bio: string;
  honors: string;
  tutorTitle: string;
  source: 'homepage' | 'pdf-only';
  researchSource: 'pdf' | 'homepage' | '';
};

export type Notice = {
  id: string;
  title: string;
  date: string;
  url: string;
  college: string;
  type: string;
};

export type Meta = {
  updatedAt: string;
  totalTeachers: number;
  withResearch: number;
  tutors: number;
  withEmail: number;
  totalNotices: number;
  sources: string[];
};
