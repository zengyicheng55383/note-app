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
  image_path: string | null;
  organized: string | null;
};

export default function NotePage() {
  const params = useParams<{ id: string }>();

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [organized, setOrganized] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [orgBusy, setOrgBusy] = useState(false);
  const [ptBusy, setPtBusy] = useState(false);
  const [points, setPoints] = useState<string[]>([]);
  const [quizBusy, setQuizBusy] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    // 用 * 取全部列，这样即使 organized 列还没加也不会报错
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    setNote(data);

    if (data) {
      setTitle(data.title);
      setTag(data.tag ?? "");
      setContent(data.content ?? "");
      setOrganized(data.organized ?? "");
      setPoints(Array.isArray(data.points) ? data.points : []);
      setQuestionCount(Array.isArray(data.questions) ? data.questions.length : 0);

      if (data.image_path) {
        const { data: signed } = await supabase.storage
          .from("note-images")
          .createSignedUrl(data.image_path, 3600);

        setImageUrl(signed?.signedUrl ?? "");
      }
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

  // 识别图片里的文字，追加到正文
  async function handleOcr() {
    if (!imageUrl) return;

    setOcrBusy(true);
    setError("");

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "识别失败");
        return;
      }

      const merged =
        (note?.content ? note.content + "\n\n" : "") +
        "【图片识别结果】\n" +
        json.text;

      const { error } = await supabase
        .from("notes")
        .update({ content: merged })
        .eq("id", params.id);

      if (error) {
        setError(error.message);
        return;
      }

      await load();
    } catch (e) {
      setError("识别失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setOcrBusy(false);
    }
  }

  // 让 AI 整理正文
  async function handleOrganize() {
    const source = note?.content?.trim() ?? "";

    if (!source) {
      setError("正文是空的：先识别图片，或者手动写点内容");
      return;
    }

    setOrgBusy(true);
    setError("");

    try {
      const res = await fetch("/api/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "整理失败");
        return;
      }

      const { error } = await supabase
        .from("notes")
        .update({ organized: json.text })
        .eq("id", params.id);

      if (error) {
        setError("保存整理结果失败：" + error.message);
        return;
      }

      await load();
    } catch (e) {
      setError("整理失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setOrgBusy(false);
    }
  }

  // 从整理版（没有就用原文）抽知识点
  async function handlePoints() {
    const source = (note?.organized || note?.content || "").trim();

    if (!source) {
      setError("没有内容可抽：先识别图片或写点正文");
      return;
    }

    setPtBusy(true);
    setError("");

    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "抽取失败");
        return;
      }

      const { error } = await supabase
        .from("notes")
        .update({ points: json.points })
        .eq("id", params.id);

      if (error) {
        setError("保存知识点失败：" + error.message);
        return;
      }

      await load();
    } catch (e) {
      setError("抽取失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPtBusy(false);
    }
  }
  // 根据知识点出题
  async function handleQuiz() {
    if (points.length === 0) {
      setError("先提取知识点，再生成题目");
      return;
    }

    setQuizBusy(true);
    setError("");

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "生成失败");
        return;
      }

      const { error } = await supabase
        .from("notes")
        .update({ questions: json.questions })
        .eq("id", params.id);

      if (error) {
        setError("保存题目失败：" + error.message);
        return;
      }

      await load();
    } catch (e) {
      setError("生成失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setQuizBusy(false);
    }
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

        {imageUrl && <img className="note-image" src={imageUrl} alt="笔记图片" />}

        <p className="detail-body">{note.content || "（还没有内容）"}</p>

        {organized && (
          <div className="organized-block">
            <p className="organized-label">✦ AI 整理版</p>
            <div className="organized-body">{organized}</div>
          </div>
        )}

        {points.length > 0 && (
          <div className="organized-block">
            <p className="organized-label">✦ 知识点（{points.length} 条）</p>
            <ol className="point-list">
              {points.map((p, i) => (
                <li key={i} className="point-item">{p}</li>
              ))}
            </ol>
          </div>
        )}
      </article>

      {error && <p className="msg">{error}</p>}

      <div className="detail-actions">
        {imageUrl && (
          <button
            className="btn-ghost"
            type="button"
            onClick={handleOcr}
            disabled={ocrBusy || orgBusy}
          >
            {ocrBusy ? "识别中…" : "识别图片文字"}
          </button>
        )}

        <button
          className="btn-ghost"
          type="button"
          onClick={handleOrganize}
          disabled={ocrBusy || orgBusy}
        >
          {orgBusy ? "整理中（约 5-15 秒）…" : "AI 整理"}
        </button>

        <button
          className="btn-ghost"
          type="button"
          onClick={handlePoints}
          disabled={ocrBusy || orgBusy || ptBusy}
        >
          {ptBusy ? "抽取中（约 5-15 秒）…" : "提取知识点"}
        </button>

        <button
          className="btn-ghost"
          type="button"
          onClick={handleQuiz}
          disabled={ocrBusy || orgBusy || ptBusy || quizBusy}
        >
          {quizBusy ? "出题中（约 5-15 秒）…" : questionCount > 0 ? "重新出题" : "生成题目"}
        </button>

        <button className="btn-new" type="button" onClick={startEdit}>
          编辑
        </button>
      </div>

      {questionCount > 0 && (
        <p className="hint">
          已生成 {questionCount} 道题，<Link href="/review">去复习 →</Link>
        </p>
      )}
    </div>
  );
}
