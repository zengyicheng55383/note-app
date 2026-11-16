// ============================================================
// 第 2 周：让页面动起来
// ============================================================
//
// 现在的目标：点「＋ 新建笔记」→ 输入标题 → 页面上真的多一张卡片。
//
// 核心思路只有一句话：
//   【数据变了，就把页面重新画一遍】
//
// 以前那 4 张卡片是「写死」在 HTML 里的，改一张就得动 HTML。
// 这一周我们反过来：数据放在数组里，页面由数组「画」出来。
// 以后要加笔记，只改数组，页面自动跟着变。
//
// ------------------------------------------------------------
// 怎么用这个文件：
//   1. 按顺序完成下面 4 个 TODO
//   2. 每完成一个，保存（Ctrl+S）+ 浏览器刷新（Ctrl+F5）
//   3. 卡住超过 20 分钟，去看同目录下的「参考答案.md」
//   4. 按 F12 打开 Console，报错会显示在这里
// ------------------------------------------------------------


// ========== 数据区（已经帮你写好了） ==========
// 这就是你页面上的 4 张卡片，只是从 HTML 变成了对象。
// 每个对象 = 一张卡片；数组 = 一整个列表。

const notes = [
  {
    id: 1,
    tag: "高等数学",
    date: "11 月 12 日",
    title: "极限的定义与性质",
    excerpt: "数列极限的 ε-N 定义：对任意 ε > 0，存在正整数 N，当 n > N 时，都有 |aₙ − a| < ε……",
  },
  {
    id: 2,
    tag: "线性代数",
    date: "11 月 13 日",
    title: "矩阵可逆的等价条件",
    excerpt: "矩阵 A 可逆 ⇔ 行列式不为零 ⇔ 满秩 ⇔ 齐次方程 Ax=0 只有零解。",
  },
  {
    id: 3,
    tag: "大学英语",
    date: "11 月 11 日",
    title: "定语从句的三个易错点",
    excerpt: "1. which 和 that 在非限制性从句里不能互换；2. 介词后面只能用 which……",
  },
  {
    id: 4,
    tag: "计算机网络",
    date: "11 月 9 日",
    title: "TCP 三次握手为什么不是两次",
    excerpt: "两次握手无法确认客户端的接收能力和服务端的发送能力，且历史重复连接请求会造成资源浪费……",
  },
];


// ========== TODO 1：写渲染函数 ==========
// 这个函数的任务：把 notes 数组变成页面上的卡片。
// 名字必须叫 render，因为后面要调用它。

function render() {
  // 1.1 找到页面里那个 <main class="note-list">，存进变量 main
  const main = document.querySelector(".note-list");
  main.innerHTML = "";
  notes.forEach((note) => {
    main.innerHTML += `
      <article class="note-card">
        <div class="note-meta">
          <span class="tag">${note.tag}</span>
          <time>${note.date}</time>
        </div>
        <h2 class="note-title">${note.title}</h2>
        <p class="note-excerpt">${note.excerpt}</p>
      </article>
    `;
  });
}

// ========== TODO 2：页面打开时先渲染一次 ==========
render(); 
const btn = document.querySelector(".btn-new");
const input = document.querySelector("#note-title");

btn.addEventListener("click", () => {
  const title = input.value.trim();
  if (!title) {
    input.focus();
    return;
  }

  notes.push({
    id: Date.now(),
    tag: "未分类",
    date: "刚刚",
    title: title,
    excerpt: "（还没有内容）",
  });

  input.value = "";
  render();
});