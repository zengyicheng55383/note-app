import Link from "next/link";
import { useState } from "react";

function NoteCard({ note, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Link href={`/note/${note.id}`} className="note-link">
      <article className="note-card">
        <div className="note-meta">
          <span className="tag">{note.tag}</span>

          <span className="meta-right">
            <time>{note.date}</time>
            {onDelete && (
              <button
                className="btn-del"
                type="button"
                title="删除这条笔记"
                onClick={(e) => {
                  // 卡片本身是个链接，必须拦住，否则会跳转到详情页
                  e.preventDefault();
                  e.stopPropagation();

                  if (confirming) {
                    onDelete(note.id);
                    return;
                  }

                  setConfirming(true);
                  setTimeout(() => setConfirming(false), 3000);
                }}
              >
                {confirming ? "确定?" : "×"}
              </button>
            )}
          </span>
        </div>

        <h2 className="note-title">{note.title}</h2>
        <p className="note-excerpt">{note.excerpt}</p>
      </article>
    </Link>
  );
}

export default NoteCard;
