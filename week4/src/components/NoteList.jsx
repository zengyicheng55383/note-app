import NoteCard from "./NoteCard";

function NoteList({ notes, onDelete }) {
  if (notes.length === 0) {
    return <p className="loading-text">还没有笔记，点右上角「＋ 新建笔记」写一条吧。</p>;
  }

  return (
    <main className="note-list">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onDelete={onDelete} />
      ))}
    </main>
  );
}

export default NoteList;
