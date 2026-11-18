# 我的笔记 · AI 整理与复习

一个能扫描手写笔记、用 AI 整理成结构化内容、自动抽取知识点并出题复习的应用。

## 现在能做什么

```
拍照 → OCR 识别 → AI 整理 → 抽知识点 → 生成题目 → 复习答题
```

- 邮箱注册 / 登录，每人只能看到自己的笔记
- 新建笔记（标题、标签、正文、照片）
- 拍照上传，图片存 Supabase Storage（私有桶 + 签名链接）
- OCR：视觉大模型把照片里的手写内容转成文字
- AI 整理：把识别结果整理成结构化文字，原文保留不动
- 知识点：抽成一条条独立可验证的陈述
- 出题：针对每条知识点生成简答题
- 复习：先自答再看答案，自评「记得 / 忘了」
- 间隔重复：按简化版 SM-2 排期，答对的隔几天再来，答错的 10 分钟后再来
- 错题本：列出曾答错的题，按错误次数排序，答案默认折叠

## 技术栈

| 层 | 用了什么 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| 样式 | 手写 CSS（globals.css）+ 少量 Tailwind |
| 数据库 | Supabase Postgres（行级安全 RLS） |
| 登录 | Supabase Auth（邮箱密码） |
| 存储 | Supabase Storage（私有桶） |
| AI | 硅基流动 · Qwen3-VL（图片识别 + 文字整理 + 出题） |
| 部署 | 暂未部署，本地运行 |

## 怎么启动

### 1. 安装依赖

```powershell
cd week4
npm install
```

### 2. 配置环境变量

复制 `.env.local` 模板（或自己新建），填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://你的项目id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SILICONFLOW_API_KEY=sk-xxx
SILICONFLOW_VL_MODEL=Qwen/Qwen3-VL-8B-Instruct
```

注意：
- `NEXT_PUBLIC_` 开头的会被打包进浏览器，只能放可公开的值
- `SILICONFLOW_API_KEY` **绝对不能**加 `NEXT_PUBLIC_` 前缀
- 值不要加引号、不要有空格

### 3. 跑起来

开发模式：

```powershell
npm run dev
```

生产模式（**手机上测试必须用这个**）：

```powershell
npm run build
npm run start
```

打开 http://localhost:3000

> 手机测试：用终端里 `Network:` 那行的地址，并确保 Windows 防火墙放行了 3000 端口。

## 数据库表

```sql
-- 笔记
create table public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text default '',          -- 原文（OCR 结果或手写）
  tag text default '未分类',
  image_path text,                  -- 图片在 Storage 里的路径
  organized text,                   -- AI 整理版
  points jsonb,                     -- 知识点数组 ["...", "..."]
  questions jsonb,                  -- 题目数组 [{q, a}, ...]
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "看自己的笔记" on public.notes for select using (auth.uid() = user_id);
create policy "插自己的笔记" on public.notes for insert with check (auth.uid() = user_id);
create policy "改自己的笔记" on public.notes for update using (auth.uid() = user_id);
create policy "删自己的笔记" on public.notes for delete using (auth.uid() = user_id);

-- 每道题的复习状态（间隔重复用）
create table public.card_state (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id bigint not null references public.notes(id) on delete cascade,
  question_index int not null,
  due_at timestamptz not null default now(),
  interval_days int not null default 0,
  ease real not null default 2.5,
  reviews int not null default 0,
  lapses int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, note_id, question_index)
);

alter table public.card_state enable row level security;

create policy "看自己的复习状态" on public.card_state for select using (auth.uid() = user_id);
create policy "插自己的复习状态" on public.card_state for insert with check (auth.uid() = user_id);
create policy "改自己的复习状态" on public.card_state for update using (auth.uid() = user_id);
create policy "删自己的复习状态" on public.card_state for delete using (auth.uid() = user_id);
```

存储桶 `note-images`（私有），路径格式 `{user_id}/{时间戳}.jpg`，三条策略限制只能操作自己目录下的文件。

## 文件结构

```
week4/src/
├── app/
│   ├── page.tsx              首页：列表 + 删除
│   ├── login/page.tsx        登录 / 注册
│   ├── new/page.tsx          新建笔记（含拍照上传 + 前端压缩）
│   ├── note/[id]/page.tsx    详情：OCR / AI 整理 / 抽知识点 / 出题 / 编辑
│   ├── review/page.tsx       复习答题（按到期时间排队）
│   ├── mistakes/page.tsx     错题本
│   ├── api/
│   │   ├── ocr/route.ts      图片 → 文字（GET 可查可用模型）
│   │   ├── organize/route.ts 文字 → 结构化整理
│   │   ├── points/route.ts   文字 → 知识点 JSON
│   │   └── quiz/route.ts     知识点 → 题目 JSON
│   ├── layout.tsx            全局外壳
│   └── globals.css           全部样式
├── components/
│   ├── NoteCard.jsx          单张卡片（含删除）
│   └── NoteList.jsx          列表
└── lib/supabase.ts           Supabase 客户端
```

## 踩过的坑（别忘）

| 坑 | 原因 |
|---|---|
| 手机上一片「加载中」 | 开发模式的 JS 包太大，iOS 加载失败。**手机测试用 `npm run build` + `npm run start`** |
| 手机打不开局域网地址 | Windows 防火墙拦了 3000 端口 |
| `prompt()` 不可用 | 页面在 iframe/沙箱里。改用页面上的输入框 |
| 模型返回 `Model disabled` | 模型下架了。打开 `/api/ocr` 看当前可用的视觉模型 |
| 存进去的数据 `column does not exist` | 加了列之后要 `notify pgrst, 'reload schema'` |
| 加了 `useEffect` 反而不保存 | 读写顺序问题：先读完再允许写（用 `loaded` 标志） |

## 还没做的

- [ ] 换成完整 FSRS 算法（现在是最简化的 SM-2）
- [ ] 部署上线（需要能稳定访问的域名）
- [ ] 移动端体验继续打磨（现在只是"能用"）
- [ ] 一篇笔记多张图片
- [ ] Markdown 渲染（现在公式是纯文本）
- [ ] 重新生成题目后，旧复习记录会错位（题目没有稳定 id）

## 开发模式提醒

手机测试统一走生产模式；改代码时用 `npm run dev`，改完要重新 `build` 才能在手机上看到。
