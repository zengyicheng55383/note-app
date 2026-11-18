"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Card = {
  noteId: number;
  noteTitle: string;
  index: number;
  q: string;
  a: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  reviews: number;
  lapses: number;
};

type NoteRow = {
  id: number;
  title: string;
  questions: { q?: string; a?: string }[] | null;
};

type StateRow = {
  note_id: number;
  question_index: number;
  due_at: string;
  interval_days: number;
  ease: number;
  reviews: number;
  lapses: number;
};

// 简化版 SM-2：答对间隔按 ease 增长，答错回到 10 分钟后重来
function nextSchedule(card: Card, correct: boolean) {
  let interval = card.intervalDays;
  let ease = card.ease;
  const reviews = card.reviews + 1;
  let lapses = card.lapses;

  if (correct) {
    if (reviews <= 1) interval = 1;
    else if (reviews === 2) interval = 3;
    else interval = Math.max(1, Math.round(interval * ease));
    ease = Math.min(3, ease + 0.1);
  } else {
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    lapses += 1;
  }

  const due = new Date();
  if (correct) due.setDate(due.getDate() + interval);
  else due.setMinutes(due.getMinutes() + 10);

  return { interval, ease, reviews, lapses, dueAt: due.toISOString() };
}

export default function ReviewPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [forgot, setForgot] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tomorrow, setTomorrow] = useState(0);
  const [userId, setUserId] = useState("");

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

      const userId = userData.user.id;

      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("id, title, questions");

      if (notesError) {
        setError(notesError.message);
        return;
      }

      const { data: statesData } = await supabase
        .from("card_state")
        .select("note_id, question_index, due_at, interval_days, ease, reviews, lapses");

      const stateMap = new Map<string, StateRow>();
      ((statesData ?? []) as StateRow[]).forEach((s) => {
        stateMap.set(s.note_id + ":" + s.question_index, s);
      });

      const all: Card[] = [];
      let notDue = 0;

      ((notesData ?? []) as NoteRow[]).forEach((n) => {
        if (!Array.isArray(n.questions)) return;

        n.questions.forEach((item, i) => {
          if (!item?.q || !item?.a) return;

          const st = stateMap.get(n.id + ":" + i);

          const card: Card = {
            noteId: n.id,
            noteTitle: n.title,
            index: i,
            q: item.q,
            a: item.a,
            dueAt: st?.due_at ?? new Date(0).toISOString(),
            intervalDays: st?.interval_days ?? 0,
            ease: st?.ease ?? 2.5,
            reviews: st?.reviews ?? 0,
            lapses: st?.lapses ?? 0,
          };

          if (new Date(card.dueAt).getTime() <= Date.now()) {
            all.push(card);
          } else {
            notDue += 1;
          }
        });
      });

      all.sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());

      setQueue(all);
      setTomorrow(notDue);
      setUserId(userId);
    } catch {
      setError("连不上服务器，检查网络后刷新");
    } finally {
      setLoading(false);
    }
  }

  async function answer(correct: boolean) {
    const card = queue[index];
    if (!card) return;

    if (correct) setKnown(known + 1);
    else setForgot(forgot + 1);

    const s = nextSchedule(card, correct);

    await supabase.from("card_state").upsert(
      {
        user_id: userId,
        note_id: card.noteId,
        question_index: card.index,
        due_at: s.dueAt,
        interval_days: s.interval,
        ease: s.ease,
        reviews: s.reviews,
        lapses: s.lapses,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,note_id,question_index" }
    );

    setIndex(index + 1);
    setRevealed(false);
  }

  if (loading) {
    return (
      <div className="app">
        <p className="loading-text">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <Link href="/" className="back">
          ← 返回列表
        </Link>
        <p className="msg">{error}</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="app">
        <Link href="/" className="back">
          ← 返回列表
        </Link>

        <h1 className="detail-title">今天没有要复习的</h1>

        {tomorrow > 0 ? (
          <p className="hint">
            还有 {tomorrow} 道题在排队，按记忆曲线会在稍后到期。现在不用看，到点再来效果最好。
          </p>
        ) : (
          <p className="hint">
            还没有题目。去一条笔记里点「提取知识点」，再点「生成题目」。
          </p>
        )}
      </div>
    );
  }

  if (index >= queue.length) {
    const total = known + forgot;
    const rate = total > 0 ? Math.round((known / total) * 100) : 0;

    return (
      <div className="app">
        <Link href="/" className="back">
          ← 返回列表
        </Link>

        <h1 className="detail-title">这一轮结束</h1>

        <div className="quiz-summary">
          <p>
            共 <strong>{total}</strong> 题，记得 <strong>{known}</strong> 题，
            忘了 <strong>{forgot}</strong> 题
          </p>
          <p className="quiz-rate">{rate}%</p>
          <p className="hint">
            答对的题已经按记忆曲线排到后面了，答错的会在 10 分钟后再次出现。
          </p>
        </div>
      </div>
    );
  }

  const card = queue[index];

  return (
    <div className="app">
      <Link href="/" className="back">
        ← 返回列表
      </Link>

      <p className="quiz-progress">
        第 {index + 1} / {queue.length} 题 · 记得 {known} · 忘了 {forgot}
        {tomorrow > 0 ? " · 另有 " + tomorrow + " 题稍后到期" : ""}
      </p>

      <div className="quiz-card">
        <p className="quiz-q">{card.q}</p>

        {revealed ? (
          <div className="quiz-a">
            <p className="quiz-a-label">答案</p>
            <p>{card.a}</p>
            <p className="hint">
              来源：{card.noteTitle}
              {" · 已复习 "}
              {card.reviews} 次
            </p>
          </div>
        ) : (
          <p className="hint">先自己在心里回答，再点下面按钮对答案。</p>
        )}
      </div>

      <div className="detail-actions">
        {!revealed ? (
          <button className="btn-new" type="button" onClick={() => setRevealed(true)}>
            显示答案
          </button>
        ) : (
          <>
            <button className="btn-new" type="button" onClick={() => answer(true)}>
              记得
            </button>
            <button className="btn-ghost" type="button" onClick={() => answer(false)}>
              忘了
            </button>
          </>
        )}
      </div>
    </div>
  );
}
