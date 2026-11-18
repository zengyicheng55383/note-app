import { useState } from "react";
import NoteList from "./components/NoteList";

const initialNotes = [
  {
    id: 1,
    tag: "高等数学",
    date: "11 月 12 日",
    title: "极限的定义与性质",
    excerpt: "数列极限的 ε-N 定义：对任意 ε > 0，存在正整数 N……",
  },
  {
    id: 2,
    tag: "线性代数",
    date: "11 月 13 日",
    title: "矩阵可逆的等价条件",
    excerpt: "矩阵 A 可逆 ⇔ 行列式不为零 ⇔ 满秩。",
  },
  {
    id: 3,
    tag: "大学英语",
    date: "11 月 11 日",
    title: "定语从句的三个易错点",
    excerpt: "which 和 that 在非限制性从句里不能互换。",
  },
  {
    id: 4,
    tag: "计算机网络",
    date: "11 月 9 日",
    title: "TCP 三次握手为什么不是两次",
    excerpt: "两次握手无法确认双方的能力。",
  },
];

function App() {
  const [notes, setNotes] = useState(initialNotes);
  const [title, setTitle] = useState("");        // ← 新增 1

  function handleAdd() {                          // ← 新增 2
    const t = title.trim();
    if (!t) return;

    setNotes([
      ...notes,
      {
        id: Date.now(),
        tag: "未分类",
        date: "刚刚",
        title: t,
        excerpt: "（还没有内容）",
      },
    ]);

    setTitle("");
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">我的笔记</h1>

        {/* ↓ 新增 3 */}
        <input
          className="input-new"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="新笔记标题…"
        />
        <button className="btn-new" type="button" onClick={handleAdd}>
          ＋ 新建笔记
        </button>
      </header>

      <NoteList notes={notes} />

      <footer className="foot">第 3 周 · React</footer>
    </div>
  );
}

export default App;