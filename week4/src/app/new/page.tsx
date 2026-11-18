"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 没登录就踢回去
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
  }, [router]);

  async function handleSave() {
    const t = title.trim();

    if (!t) {
      setError("标题不能为空");
      return;
    }

    setBusy(true);
    setError("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("notes").insert({
      user_id: userData.user.id,
      title: t,
      tag: tag.trim() || "未分类",
      content: content.trim(),
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="app">
      <Link href="/" className="back">
        ← 返回列表
      </Link>

      <h1 className="detail-title">新建笔记</h1>

      <div className="field">
        <input
          className="input-plain"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题，比如：矩阵可逆的等价条件"
          autoFocus
        />
      </div>

      <div className="field">
        <input
          className="input-plain"
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="科目 / 标签（可不填）"
        />
      </div>

      <div className="field">
        <textarea
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="正文…&#10;可以写多行，公式暂时用文字表示。"
          rows={10}
        />
      </div>

      {error && <p className="msg">{error}</p>}

      <button
        className="btn-new btn-block"
        type="button"
        onClick={handleSave}
        disabled={busy}
      >
        {busy ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
