# scu-tutor-finder

高校导师与研究方向检索工具。把分散在学校官网的公开教师名录收成一处：按研究方向筛选、查看职称与联系方式、跳转官方主页，并用本库资料做检索式问答。

当前数据范围是四川大学计算机学院（软件学院）。

- 在线使用：https://qiuizi.github.io/scu-tutor-finder/
- 源码：https://github.com/Qiuizi/scu-tutor-finder
- 维护：[Qiuizi](https://github.com/Qiuizi)

线上是纯静态站点。问答助手在线上走「本地检索」（直接匹配库内数据，不需要 API Key）。需要自然语言对话时，按下文在本地配置模型。

## 在网页上怎么用

1. **搜索。** 在页首「检索入口」输入姓名、研究方向或论文关键词。按 `/` 可随时聚焦搜索框。
2. **筛选。** 用职称、「仅看研究生导师」和方向标签缩小范围，并可切换排序与网格/列表。
3. **查看。** 点开一位教师，可看简介、公开邮箱和官方主页。右下角「问问导师库」只根据本库资料回答。

打开页面即可检索，无需安装。

## 它解决什么问题

学院官网的导师信息分散在三个地方，且字段填写率参差不齐：

| 数据源 | 提供什么 | 实测情况 |
|---|---|---|
| `faculty.scu.edu.cn` 教师主页系统 | 姓名、职称、邮箱、办公地点、个人简介、**研究方向**、论文、项目 | 学院列表 **166 人**；全校仅 188 个主页 |
| 《研究生导师名录》PDF | 研究方向、职称（旧） | 88 页，解析出 **81 位导师**，仅作兜底 |
| `ai.scu.edu.cn` | 学院通知、新闻、科研成果 | 26 条动态 |

**方向与职称一律以个人主页为准**，PDF 只在学校主页没填时兜底。名录 PDF 是较早的静态文件，会过时。例如赵启军主页写的是「计算机视觉、生物特征识别」、职称为教授，而 PDF 里还是「模式识别/图像处理」和「副高」。

本工具把三者合并成一个可检索的库：**188 位教师**，其中 99 位可查研究方向、82 位可确认研究生导师身份、177 位有公开邮箱、27 位有论文或项目记录。页头数字来自 `web/public/data/meta.json`，与这份统计一致。

## 目录结构

```
scu-tutor-finder/
├── crawler/              # 数据抓取（Node，无额外框架）
│   ├── 01-roster.mjs     # 学院教师名单（21 页分页）
│   ├── 02-detail.mjs     # 个人主页字段 + 邮箱解密
│   ├── 03-pdf.mjs        # 导师名录 PDF 解析（按坐标还原表格）
│   ├── 04-merge.mjs      # 多源合并
│   ├── 05-allfaculty.mjs # 全校主页枚举（备用，定位漏收导师）
│   ├── 06-notices.mjs    # 学院通知
│   ├── 07-achievements.mjs # 论文与项目（单独运行，不在默认更新流水线里）
│   ├── lib.mjs
│   └── update.mjs        # 一键更新流水线
├── data/                 # 原始数据（JSON）
├── scripts/              # 静态导出与本地预览
├── web/                  # Next.js 16 + Tailwind v4
│   ├── app/page.tsx      # 主页面
│   ├── app/api/agent/    # 问答接口（密钥只在服务端；静态部署时自动移除）
│   ├── components/       # 检索、详情抽屉、通知、助手面板
│   └── public/data/      # 前端直接加载的数据（构建时也从此读取）
└── .cache/               # 抓取缓存（可删，删后重抓）
```

## 本地运行

在仓库根目录执行：

```bash
git clone https://github.com/Qiuizi/scu-tutor-finder.git
cd scu-tutor-finder

npm install
npm --prefix web install

npm run dev
```

打开 http://localhost:3000

生产模式同样在根目录：

```bash
npm run build
npm start
```

只想浏览检索、不抓新数据时，仓库里已带好 `web/public/data/`，装完依赖直接 `npm run dev` 即可。

## 配置问答助手

助手可以接一个大模型。**密钥只放在服务端，不会暴露到浏览器。** 不配置时，检索和详情完全可用，右下角助手使用本地检索。

```bash
cd web
cp .env.example .env.local
```

`web/.env.example`：

```ini
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_API_KEY=
```

`LLM_BASE_URL` 可以换成任何 OpenAI 兼容接口。填好 `LLM_API_KEY` 后重启 `npm run dev`。

## 更新数据

```bash
npm run update          # 全量重抓（名单 → 详情 → PDF → 合并 → 通知）
npm run update:quick    # 只重新合并 + 抓通知（走缓存，几十秒）
```

数据更新后，统计会写入 `web/public/data/meta.json`，页头显示其中的日期和人数。

数据提交到 `main` 后，GitHub Actions 会重新构建并发布线上站点。

## 部署（GitHub Pages）

线上是纯静态导出，没有后端。

| | 线上（静态） | 本地（完整版） |
|---|---|---|
| 检索 / 筛选 / 详情 | 可用 | 可用 |
| 问答助手 | 本地检索（匹配库内数据） | 可接大模型做自然语言问答 |
| 需要 API Key | 不需要 | 只有启用模型问答时需要 |

本地验证静态产物：

```bash
STATIC_EXPORT=1 node scripts/build-static.mjs   # 产物在 web/out
node scripts/preview-static.mjs 4000            # 起本地静态服务
```

推送 `main` 分支后，`.github/workflows/deploy.yml` 会构建并发布到 Pages，站点路径为 `/scu-tutor-finder/`。首次部署需在仓库 Settings → Pages → Source 选择 **GitHub Actions**。

## 已知限制

1. **研究方向覆盖率 52.7%**。不是抓取失败——学院主页上很多教师（尤其讲师、退休教师）根本没填这一栏，字段本身就是空的。研究生导师名录中的 81 位，研究方向是齐的（81/81）。
2. **计算机学院主站 `cs.scu.edu.cn` 有瑞数 WAF**（`$_ts` 动态防护），静态请求拿不到 HTML。因此通知目前只收录人工智能学院。如需补全，得用无头浏览器。
3. **22 位资深导师没有个人主页**（如陈兴蜀、唐华锦、周激流）。学校只给他们上了名录 PDF，所以信息取自 PDF，页面会标注「无个人主页」。
4. **PDF 的邮箱列存在错位**（学校文件本身的问题，如把别人的邮箱排在某院士那行）。因此邮箱一律以个人主页解密结果为准，PDF 邮箱仅作兜底。
5. 邮箱通过站点自带的 `tsitesencrypt.jsp` 接口解密，并非破解；这本来就是这个页面给浏览器用的接口。

## 技术选型说明

- **不用数据库**：188 条记录，前端直接全量加载，筛选零延迟。
- **不用向量库**：检索用「姓名 > 方向标签 > 简介」的分层关键词打分，可解释、零依赖，188 人规模足够准。
- **不用 shadcn CLI**：视觉遵循浅色底、细边框、柔和阴影、靛蓝点缀，组件手写，不引入 radix 依赖。
- **不用 Google Fonts**：改用系统字体栈（PingFang / 微软雅黑 / Noto Sans SC）。
- **交互**：搜索关键词高亮、网格/列表切换、按职称/姓名/成果排序、`/` 聚焦搜索、筛选吸顶、成果与简介折叠展开。

## 免责

本项目仅聚合学校官网公开信息，不做评价、不打分。权威信息以学院官网为准。
