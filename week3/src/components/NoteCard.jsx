function NoteCard({ note }) {
  return (
    <article className="note-card">
      <div className="note-meta">
        <span className="tag">{note.tag}</span>
        <time>{note.date}</time>
      </div>
      <h2 className="note-title">{note.title}</h2>
      <p className="note-excerpt">{note.excerpt}</p>
    </article>
  );
}

export default NoteCard;