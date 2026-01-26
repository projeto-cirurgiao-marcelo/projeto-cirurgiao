'use client';

import { useState, useEffect, useRef } from 'react';
import { notesService, VideoNote } from '@/lib/api/notes.service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  StickyNote, 
  Plus, 
  Clock, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface VideoNotesProps {
  videoId: string;
  currentTime?: number;
  onSeek?: (timestamp: number) => void;
}

export function VideoNotes({ videoId, currentTime = 0, onSeek }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [capturedTimestamp, setCapturedTimestamp] = useState(0); // Timestamp capturado ao abrir o formulário
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotes();
  }, [videoId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.getByVideo(videoId);
      setNotes(data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      setCreating(true);
      // Usa o timestamp capturado no momento que o usuário clicou em "Nova Nota"
      const newNote = await notesService.create(videoId, {
        content: newNoteContent.trim(),
        timestamp: capturedTimestamp,
      });
      setNotes([...notes, newNote].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)));
      setNewNoteContent('');
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao criar nota:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      setSaving(true);
      const updatedNote = await notesService.update(noteId, {
        content: editContent.trim(),
      });
      setNotes(notes.map(n => n.id === noteId ? updatedNote : n));
      setEditingNoteId(null);
      setEditContent('');
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    try {
      await notesService.delete(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
    }
  };

  const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Minhas Anotações</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Minhas Anotações</h3>
          {notes.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        <Button
          onClick={() => {
            if (!showForm) {
              // Captura o timestamp no momento que o usuário clica em "Nova Nota"
              setCapturedTimestamp(Math.floor(currentTime));
            }
            setShowForm(!showForm);
          }}
          size="sm"
          variant={showForm ? "outline" : "default"}
          className={showForm ? "" : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Nova Nota
            </>
          )}
        </Button>
      </div>

      {/* Formulário de Nova Nota */}
      {showForm && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-sm text-amber-700">
            <Clock className="h-4 w-4" />
            <span>Timestamp: {formatTimestamp(capturedTimestamp)}</span>
          </div>
          <Textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Digite sua anotação aqui..."
            className="mb-2 min-h-[80px] resize-none"
            maxLength={5000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {newNoteContent.length}/5000 caracteres
            </span>
            <Button
              onClick={handleCreateNote}
              disabled={creating || !newNoteContent.trim()}
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de Notas */}
      {notes.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <StickyNote className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nenhuma anotação ainda</p>
          <p className="text-xs text-gray-400 mt-1">
            Clique em "Nova Nota" para criar sua primeira anotação
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Botões de navegação */}
          {notes.length > 2 && (
            <>
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full p-1 border border-gray-200"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full p-1 border border-gray-200"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </>
          )}

          {/* Cards de Notas */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex-shrink-0 w-64 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                {editingNoteId === note.id ? (
                  // Modo de edição
                  <div>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="mb-2 min-h-[60px] resize-none text-sm"
                      maxLength={5000}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={saving || !editContent.trim()}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditContent('');
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo de visualização
                  <>
                    {/* Timestamp clicável */}
                    {note.timestamp !== null && (
                      <button
                        onClick={() => onSeek?.(note.timestamp!)}
                        className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 mb-2 bg-amber-100 px-2 py-0.5 rounded-full"
                      >
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(note.timestamp)}
                      </button>
                    )}

                    {/* Conteúdo */}
                    <p className="text-sm text-gray-700 line-clamp-4 mb-2">
                      {note.content}
                    </p>

                    {/* Ações */}
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditContent(note.content);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Versão compacta para mobile
export function VideoNotesCompact({ videoId, currentTime = 0, onSeek }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [videoId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.getByVideo(videoId);
      setNotes(data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      setCreating(true);
      const newNote = await notesService.create(videoId, {
        content: newNoteContent.trim(),
        timestamp: Math.floor(currentTime),
      });
      setNotes([...notes, newNote].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)));
      setNewNoteContent('');
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao criar nota:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          <span className="text-sm text-amber-700">Carregando notas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            Anotações ({notes.length})
          </span>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Formulário compacto */}
      {showForm && (
        <div className="mb-3 p-2 bg-white rounded border border-amber-200">
          <Textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Digite sua anotação..."
            className="mb-2 min-h-[60px] resize-none text-sm"
            maxLength={5000}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateNote}
              disabled={creating || !newNoteContent.trim()}
              size="sm"
              className="flex-1 h-7 text-xs bg-amber-600 hover:bg-amber-700"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
            </Button>
            <Button
              onClick={() => {
                setShowForm(false);
                setNewNoteContent('');
              }}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      {notes.length === 0 ? (
        <p className="text-xs text-amber-600 text-center py-2">
          Nenhuma anotação ainda
        </p>
      ) : (
        <div className="space-y-2">
          {(showAll ? notes : notes.slice(0, 2)).map((note) => (
            <div
              key={note.id}
              className="bg-white rounded p-2 border border-amber-100"
            >
              {note.timestamp !== null && (
                <button
                  onClick={() => onSeek?.(note.timestamp!)}
                  className="text-xs text-amber-600 hover:text-amber-800 mb-1 flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(note.timestamp)}
                </button>
              )}
              <p className="text-xs text-gray-700 line-clamp-2">{note.content}</p>
            </div>
          ))}
          
          {notes.length > 2 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-amber-600 hover:text-amber-800 w-full text-center py-1"
            >
              {showAll ? 'Ver menos' : `Ver mais ${notes.length - 2} notas`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
