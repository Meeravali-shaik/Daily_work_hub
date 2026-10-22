import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Search,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import { Note } from '../types/database';

export const NotesView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { notes, saveRow, softDelete } = useHubStore();

  const [search, setSearch] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);

  const [activeTitle, setActiveTitle] = useState('');
  const [activeBody, setActiveBody] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // Sync active note on selection
  useEffect(() => {
    const cur = notes.find((n) => n.id === selectedNoteId);
    if (cur) {
      setActiveTitle(cur.title || '');
      setActiveBody(cur.body || '');
      setIsSaved(true);
    } else if (notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }, [selectedNoteId, notes]);

  // Debounced auto-save
  useEffect(() => {
    if (!selectedNoteId) return;
    const cur = notes.find((n) => n.id === selectedNoteId);
    if (!cur) return;

    if (activeTitle === cur.title && activeBody === cur.body) {
      setIsSaved(true);
      return;
    }

    setIsSaved(false);
    const timer = setTimeout(async () => {
      await saveRow('notes', {
        ...cur,
        title: activeTitle,
        body: activeBody,
        version: (cur.version || 1) + 1,
      });
      setIsSaved(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [activeTitle, activeBody, selectedNoteId, notes, saveRow]);

  const handleCreateNote = async () => {
    const newId = await saveRow('notes', {
      title: 'Untitled Note',
      body: '',
      version: 1,
    });
    setSelectedNoteId(newId);
  };

  const filteredNotes = notes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[580px]">
        {/* Left Notes Sidebar */}
        <div className="border-r border-stone-200 dark:border-stone-800 flex flex-col">
          {/* Header & search */}
          <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Notes & Scratchpad</span>
              </h3>
              <button
                onClick={handleCreateNote}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-colors"
                title="Create Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* List of notes */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 no-scrollbar">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">No notes found</div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                const isConflict = note.title?.includes('(Conflict Copy)');

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-l-3 border-amber-500'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {isConflict && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold">
                          Conflict
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                      {note.body ? note.body.slice(0, 80) : 'Empty note'}
                    </p>
                    <div className="text-[9px] text-stone-400 mt-1 font-mono">
                      v{note.version} • {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor Area */}
        <div className="md:col-span-2 flex flex-col p-5 bg-white dark:bg-stone-900">
          {selectedNoteId ? (
            <div className="flex-1 flex flex-col space-y-3">
              {/* Top toolbar */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={activeTitle}
                  onChange={(e) => setActiveTitle(e.target.value)}
                  className="font-display font-bold text-lg text-stone-900 dark:text-stone-100 bg-transparent border-none focus:outline-none flex-1 mr-3"
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 font-mono">
                    {isSaved ? 'Saved' : 'Saving...'}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm('Delete this note?')) {
                        softDelete('notes', selectedNoteId);
                        setSelectedNoteId(null);
                      }
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body textarea */}
              <textarea
                placeholder="Type your notes in Markdown or plain text..."
                value={activeBody}
                onChange={(e) => setActiveBody(e.target.value)}
                className="flex-1 w-full p-2 text-xs font-mono rounded-xl bg-stone-50/50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-stone-400">
              Select or create a note from the left sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
