'use client';

import { useState, useEffect } from 'react';
import { notesService, VideoNote } from '@/lib/api/notes.service';
import { logger } from '@/lib/logger';
import {
  AtlasNoteEditor,
  AtlasNoteRow,
  AtlasNotesList,
} from '@/components/atlas';

interface VideoNotesProps {
  videoId: string;
  currentTime?: number;
  onSeek?: (timestamp: number) => void;
}

function formatTimestamp(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Lista de anotações ancoradas em timestamps.
 * Apresentação delegada a AtlasNotesList + AtlasNoteRow + AtlasNoteEditor.
 */
export function VideoNotes({ videoId, currentTime = 0, onSeek }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [capturedTimestamp, setCapturedTimestamp] = useState(0);

  useEffect(() => {
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.getByVideo(videoId);
      setNotes(data);
    } catch (error) {
      logger.error('Erro ao carregar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewNoteForm = () => {
    setCapturedTimestamp(Math.floor(currentTime));
    setNewNoteContent('');
    setShowForm(true);
  };

  const cancelNewNote = () => {
    setShowForm(false);
    setNewNoteContent('');
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      setCreating(true);
      const newNote = await notesService.create(videoId, {
        content: newNoteContent.trim(),
        timestamp: capturedTimestamp,
      });
      setNotes(
        [...notes, newNote].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        ),
      );
      setNewNoteContent('');
      setShowForm(false);
    } catch (error) {
      logger.error('Erro ao criar nota:', error);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (note: VideoNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      setSaving(true);
      const updatedNote = await notesService.update(noteId, {
        content: editContent.trim(),
      });
      setNotes(notes.map((n) => (n.id === noteId ? updatedNote : n)));
      setEditingNoteId(null);
      setEditContent('');
    } catch (error) {
      logger.error('Erro ao atualizar nota:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    try {
      await notesService.delete(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (error) {
      logger.error('Erro ao excluir nota:', error);
    }
  };

  const currentTs = formatTimestamp(Math.floor(currentTime));
  const sortedNotes = [...notes].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
  );

  return (
    <AtlasNotesList
      count={notes.length}
      currentTimestamp={currentTs}
      onNew={showForm ? undefined : openNewNoteForm}
      disabled={showForm}
      loading={loading}
      hint={
        notes.length === 0 && !showForm
          ? 'Nenhuma anotação ainda. Clique em "Nova em X:XX" para criar a primeira no momento atual da aula.'
          : undefined
      }
    >
      {showForm && (
        <div className="mb-3">
          <AtlasNoteEditor
            timestamp={formatTimestamp(capturedTimestamp)}
            value={newNoteContent}
            onChange={setNewNoteContent}
            onSave={handleCreateNote}
            onCancel={cancelNewNote}
            saving={creating}
            placeholder="Anote pontos-chave, dúvidas, links..."
          />
        </div>
      )}

      {sortedNotes.map((note) =>
        editingNoteId === note.id ? (
          <div key={note.id} className="py-2">
            <AtlasNoteEditor
              timestamp={
                note.timestamp !== null
                  ? formatTimestamp(note.timestamp)
                  : undefined
              }
              value={editContent}
              onChange={setEditContent}
              onSave={() => handleUpdateNote(note.id)}
              onCancel={cancelEdit}
              saving={saving}
              compact
            />
          </div>
        ) : (
          <AtlasNoteRow
            key={note.id}
            timestamp={
              note.timestamp !== null
                ? formatTimestamp(note.timestamp)
                : undefined
            }
            body={note.content}
            onSeek={
              note.timestamp !== null && onSeek
                ? () => onSeek(note.timestamp!)
                : undefined
            }
            onEdit={() => startEdit(note)}
            onDelete={() => handleDeleteNote(note.id)}
          />
        ),
      )}
    </AtlasNotesList>
  );
}

/**
 * Versão compacta para mobile.
 */
export function VideoNotesCompact({
  videoId,
  currentTime = 0,
  onSeek,
}: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [capturedTimestamp, setCapturedTimestamp] = useState(0);

  useEffect(() => {
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.getByVideo(videoId);
      setNotes(data);
    } catch (error) {
      logger.error('Erro ao carregar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const openForm = () => {
    setCapturedTimestamp(Math.floor(currentTime));
    setNewNoteContent('');
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setNewNoteContent('');
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      setCreating(true);
      const newNote = await notesService.create(videoId, {
        content: newNoteContent.trim(),
        timestamp: capturedTimestamp,
      });
      setNotes(
        [...notes, newNote].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        ),
      );
      setNewNoteContent('');
      setShowForm(false);
    } catch (error) {
      logger.error('Erro ao criar nota:', error);
    } finally {
      setCreating(false);
    }
  };

  const sortedNotes = [...notes].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
  );
  const visibleNotes = showAll ? sortedNotes : sortedNotes.slice(0, 2);
  const currentTs = formatTimestamp(Math.floor(currentTime));

  return (
    <AtlasNotesList
      compact
      title="Anotações"
      count={notes.length}
      currentTimestamp={currentTs}
      onNew={showForm ? undefined : openForm}
      disabled={showForm}
      loading={loading}
      hint={
        notes.length === 0 && !showForm
          ? 'Nenhuma anotação ainda. Toque "Nova em X:XX" para criar.'
          : undefined
      }
    >
      {showForm && (
        <div className="mb-2">
          <AtlasNoteEditor
            compact
            timestamp={formatTimestamp(capturedTimestamp)}
            value={newNoteContent}
            onChange={setNewNoteContent}
            onSave={handleCreateNote}
            onCancel={cancelForm}
            saving={creating}
          />
        </div>
      )}

      {visibleNotes.map((note) => (
        <AtlasNoteRow
          key={note.id}
          timestamp={
            note.timestamp !== null
              ? formatTimestamp(note.timestamp)
              : undefined
          }
          body={note.content}
          onSeek={
            note.timestamp !== null && onSeek
              ? () => onSeek(note.timestamp!)
              : undefined
          }
        />
      ))}

      {notes.length > 2 && !showForm && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-2 mt-1 text-center text-[12px] font-medium text-atlas-primary-2 hover:text-atlas-primary"
        >
          {showAll ? 'Ver menos' : `Ver mais ${notes.length - 2} ${notes.length - 2 === 1 ? 'nota' : 'notas'}`}
        </button>
      )}
    </AtlasNotesList>
  );
}
