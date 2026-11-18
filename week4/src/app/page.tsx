"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NoteList from "../components/NoteList";
import { supabase } from "../lib/supabase";

// 页面用的数据形状（NoteCard 需要 date/excerpt，数据库里是 created_at/content）
type NoteView = {
  id: number;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
};

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 打开页面：先看有没有登录，再加载笔记
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setEmail(data.user.email ?? "");
      await loadNotes();
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, tag, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setNotes(
      (data ?? []).map((n) => ({
        id: n.id,
        tag: n.tag ?? "未分类",
        date: new Date(n.created_at).toLocaleDateString("zh-CN"),
        title: n.title,
        excerpt: n.content || "（还没有内容）",
      }))
    );
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadNotes();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">我的笔记</h1>
        <Link href="/new" className="btn-new">
          ＋ 新建笔记
        </Link>
      </header>

      <div className="user-bar">
        <span>{email}</span>
        <button className="link-btn" type="button" onClick={handleLogout}>
          退出登录
        </button>
      </div>

      {error && <p className="msg">{error}</p>}

      {loading ? (
        <p className="loading-text">加载中…</p>
      ) : (
        <NoteList notes={notes} onDelete={handleDelete} />
      )}

      <footer className="foot">第 7 周 · 正文与新建页</footer>
    </div>
  );
}
