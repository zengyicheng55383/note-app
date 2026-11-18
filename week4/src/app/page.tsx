"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NoteList from "../components/NoteList";
import { supabase } from "../lib/supabase";

type NoteView = {
  id: number;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
};

type NoteRow = {
  id: number;
  title: string;
  content: string | null;
  tag: string | null;
  created_at: string;
};

// 给请求加超时，避免永远卡住。
// 注意参数类型是 PromiseLike：Supabase 的查询对象是 thenable，不是标准 Promise
function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("请求超时 " + ms / 1000 + " 秒"));
    }, ms);

    Promise.resolve(p).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState("启动");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStep("1 检查登录状态…");

        const { data } = await withTimeout(supabase.auth.getUser(), 15000);
        if (cancelled) return;

        setStep(
          "2 登录检查完成：" + (data.user ? "已登录 " + data.user.email : "未登录")
        );

        if (!data.user) {
          router.replace("/login");
          return;
        }

        setEmail(data.user.email ?? "");
        await loadNotes();
      } catch (e) {
        if (!cancelled) {
          setError("连不上服务器：" + (e instanceof Error ? e.message : String(e)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setStep((s) => s + " → 结束");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function loadNotes() {
    setStep("3 加载笔记…");

    const { data, error } = await withTimeout(
      supabase
        .from("notes")
        .select("id, title, content, tag, created_at")
        .order("created_at", { ascending: false }),
      15000
    );

    if (error) {
      setError(error.message);
      setStep("4 加载失败：" + error.message);
      return;
    }

    const rows = (data ?? []) as NoteRow[];

    setNotes(
      rows.map((n) => ({
        id: n.id,
        tag: n.tag ?? "未分类",
        date: new Date(n.created_at).toLocaleDateString("zh-CN"),
        title: n.title,
        excerpt: n.content || "（还没有内容）",
      }))
    );

    setStep("4 加载完成，" + rows.length + " 条");
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
        <div className="top-actions">
          <Link href="/mistakes" className="btn-ghost">
            错题本
          </Link>
          <Link href="/review" className="btn-ghost">
            复习
          </Link>
          <Link href="/new" className="btn-new">
            ＋ 新建笔记
          </Link>
        </div>
      </header>

      <div className="user-bar">
        <span>{email}</span>
        <button className="link-btn" type="button" onClick={handleLogout}>
          退出登录
        </button>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <p className="debug-line">调试：{step}</p>
      )}

      {error && <p className="msg">{error}</p>}

      {loading ? (
        <p className="loading-text">加载中…</p>
      ) : (
        <NoteList notes={notes} onDelete={handleDelete} />
      )}

      <footer className="foot">第 8 周 · 拍照上传</footer>
    </div>
  );
}
