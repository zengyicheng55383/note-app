import NoteCard from "./NoteCard";

function NoteList({ notes }) {
  return (
    <main className="note-list">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </main>
  );
}

export default NoteList;