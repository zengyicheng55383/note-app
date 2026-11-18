"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Mistake = {
  noteId: number;
  noteTitle: string;
  q: string;
  a: string;
  lapses: number;
  reviews: number;
  intervalDays: number;
};

type StateRow = {
  note_id: number;
  question_index: number;
  lapses: number;
  reviews: number;
  interval_days: number;
};

type NoteRow = {
  id: number;
  title: string;
  questions: { q?: string; a?: string }[] | null;
};

export default function MistakesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Mistake[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [router]);

  async function load() {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: statesData, error: statesError } = await supabase
        .from("card_state")
        .select("note_id, question_index, lapses, reviews, interval_days")
        .gt("lapses", 0)
        .order("lapses", { ascending: false });

      if (statesError) {
        setError(statesError.message);
        return;
      }

      const states = (statesData ?? []) as StateRow[];

      if (states.length === 0) {
        setItems([]);
        return;
      }

      const noteIds = Array.from(new Set(states.map((s) => s.note_id)));

      const { data: notesData } = await supabase
        .from("notes")
        .select("id, title, questions")
        .in("id", noteIds);

      const noteMap = new Map<number, NoteRow>();
      ((notesData ?? []) as NoteRow[]).forEach((n) => noteMap.set(n.id, n));

      const list: Mistake[] = [];

      states.forEach((s) => {
        const note = noteMap.get(s.note_id);
        const item = note?.questions?.[s.question_index];

        if (!note || !item?.q || !item?.a) return;

        list.push({
          noteId: s.note_id,
          noteTitle: note.title,
          q: item.q,
          a: item.a,
          lapses: s.lapses,
          reviews: s.reviews,
          intervalDays: s.interval_days,
        });
      });

      setItems(list);
    } catch {
      setError("连不上服务器，检查网络后刷新");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <p className="loading-text">加载中…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Link href="/" className="back">
        ← 返回列表
      </Link>

      <div className="page-head">
        <h1 className="detail-title">错题本</h1>
        {items.length > 0 && (
          <Link href="/review" className="btn-new">
            去复习
          </Link>
        )}
      </div>

      {error && <p className="msg">{error}</p>}

      {items.length === 0 ? (
        <p className="hint">
          还没有错题。答对几次之后，这里会空着 —— 空着是好事。
        </p>
      ) : (
        <>
          <p className="hint">
            共 {items.length} 道题。错得越多，说明这个知识点越需要重新看原文。
          </p>

          {items.map((item, i) => (
            <div className="mistake-card" key={item.noteId + ":" + i}>
              <div className="mistake-head">
                <span className="mistake-count">错 {item.lapses} 次</span>
                <span className="mistake-src">{item.noteTitle}</span>
              </div>

              <p className="mistake-q">{item.q}</p>

              {openIndex === i ? (
                <div className="quiz-a">
                  <p className="quiz-a-label">答案</p>
                  <p>{item.a}</p>
                </div>
              ) : (
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => setOpenIndex(i)}
                >
                  显示答案
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
