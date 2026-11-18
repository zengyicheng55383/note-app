"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type NoteDetail = {
  id: number;
  title: string;
  content: string;
  tag: string;
  created_at: string;
};

export default function NotePage() {
  const params = useParams<{ id: string }>();

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 编辑中的临时值（不点保存就不会写进数据库）
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    const { data } = await supabase
      .from("notes")
      .select("id, title, content, tag, created_at")
      .eq("id", params.id)
      .maybeSingle();

    setNote(data);

    if (data) {
      setTitle(data.title);
      setTag(data.tag ?? "");
      setContent(data.content ?? "");
    }

    setLoading(false);
  }

  function startEdit() {
    setEditing(true);
    setError("");
  }

  function cancelEdit() {
    if (note) {
      setTitle(note.title);
      setTag(note.tag ?? "");
      setContent(note.content ?? "");
    }
    setEditing(false);
    setError("");
  }

  async function handleSave() {
    const t = title.trim();

    if (!t) {
      setError("标题不能为空");
      return;
    }

    setBusy(true);
    setError("");

    const { error } = await supabase
      .from("notes")
      .update({
        title: t,
        tag: tag.trim() || "未分类",
        content: content.trim(),
      })
      .eq("id", params.id);

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    setEditing(false);
    await load();
  }

  if (loading) {
    return (
      <div className="app">
        <p className="loading-text">加载中…</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="app">
        <Link href="/" className="back">
          ← 返回列表
        </Link>
        <p className="loading-text">找不到这条笔记</p>
      </div>
    );
  }

  // 编辑模式
  if (editing) {
    return (
      <div className="app">
        <button className="back back-btn" type="button" onClick={cancelEdit}>
          ← 取消编辑
        </button>

        <div className="field">
          <input
            className="input-plain"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
          />
        </div>

        <div className="field">
          <input
            className="input-plain"
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="科目 / 标签"
          />
        </div>

        <div className="field">
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="正文…"
            rows={14}
          />
        </div>

        {error && <p className="msg">{error}</p>}

        <div className="detail-actions">
          <button
            className="btn-new"
            type="button"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? "保存中…" : "保存"}
          </button>
          <button className="btn-ghost" type="button" onClick={cancelEdit}>
            取消
          </button>
        </div>
      </div>
    );
  }

  // 阅读模式
  return (
    <div className="app">
      <Link href="/" className="back">
        ← 返回列表
      </Link>

      <article>
        <div className="note-meta">
          <span className="tag">{note.tag ?? "未分类"}</span>
          <time>{new Date(note.created_at).toLocaleDateString("zh-CN")}</time>
        </div>
        <h1 className="detail-title">{note.title}</h1>
        <p className="detail-body">{note.content || "（还没有内容）"}</p>
      </article>

      {error && <p className="msg">{error}</p>}

      <div className="detail-actions">
        <button className="btn-new" type="button" onClick={startEdit}>
          编辑
        </button>
      </div>
    </div>
  );
}