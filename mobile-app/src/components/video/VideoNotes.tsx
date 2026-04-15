import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notesService } from '../../services/api/notes.service';
import type { VideoNote } from '../../types/notes.types';
import { Colors as colors } from '../../constants/colors';

interface VideoNotesProps {
  videoId: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function VideoNotes({ videoId, currentTime, onSeek }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<VideoNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [useTimestamp, setUseTimestamp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [videoId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await notesService.listByVideo(videoId);
      setNotes(data);
    } catch (err) {
      console.error('Erro ao carregar notas:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setNoteContent('');
    setUseTimestamp(true);
    setShowModal(true);
  };

  const openEditModal = (note: VideoNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setUseTimestamp(note.timestamp !== null);
    setShowModal(true);
  };

  const handleSave = useCallback(async () => {
    if (!noteContent.trim()) return;

    try {
      setSaving(true);
      const timestamp = useTimestamp ? Math.floor(currentTime) : undefined;

      if (editingNote) {
        const updated = await notesService.update(editingNote.id, {
          content: noteContent.trim(),
          timestamp,
        });
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const created = await notesService.create(videoId, {
          content: noteContent.trim(),
          timestamp,
        });
        setNotes((prev) => [...prev, created].sort((a, b) => {
          if (a.timestamp === null && b.timestamp === null) return 0;
          if (a.timestamp === null) return 1;
          if (b.timestamp === null) return -1;
          return a.timestamp - b.timestamp;
        }));
      }

      setShowModal(false);
      setNoteContent('');
      setEditingNote(null);
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a nota. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [noteContent, useTimestamp, currentTime, editingNote, videoId]);

  const handleDelete = (note: VideoNote) => {
    Alert.alert('Excluir nota', 'Tem certeza que deseja excluir esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await notesService.delete(note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
          } catch (error) {
            console.error('Erro ao excluir nota:', error);
            Alert.alert('Erro', 'Nao foi possivel excluir a nota.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando notas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="create-outline" size={16} color={colors.accent} />
            <Text style={styles.headerTitle}>Minhas Notas</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Nova</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de notas */}
        {notes.length > 0 ? (
          <View style={styles.notesList}>
            {notes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              return (
                <View key={note.id} style={styles.noteCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setExpandedNoteId(isExpanded ? null : note.id)
                    }
                  >
                    {/* Timestamp badge + date */}
                    <View style={styles.noteHeader}>
                      {note.timestamp !== null ? (
                        <TouchableOpacity
                          style={styles.timestampBadge}
                          onPress={() => onSeek(note.timestamp!)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="play"
                            size={10}
                            color={colors.accent}
                          />
                          <Text style={styles.timestampText}>
                            {formatTimestamp(note.timestamp)}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.noTimestampBadge}>
                          <Text style={styles.noTimestampText}>Sem tempo</Text>
                        </View>
                      )}
                      <Text style={styles.noteDate}>
                        {formatDate(note.createdAt)}
                      </Text>
                    </View>

                    {/* Content */}
                    <Text
                      style={styles.noteContent}
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {note.content}
                    </Text>
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(note)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(note)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-text-outline"
              size={32}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Nenhuma nota ainda</Text>
            <Text style={styles.emptyText}>
              Adicione notas enquanto assiste a aula para revisar depois!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de criar/editar nota */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNote ? 'Editar Nota' : 'Nova Nota'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Escreva sua nota aqui..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.timestampToggle}>
              <View style={styles.timestampToggleLeft}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.timestampToggleText}>
                  Marcar timestamp ({formatTimestamp(Math.floor(currentTime))})
                </Text>
              </View>
              <Switch
                value={useTimestamp}
                onValueChange={setUseTimestamp}
                trackColor={{ false: colors.border, true: colors.accent + '60' }}
                thumbColor={useTimestamp ? colors.accent : colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!noteContent.trim() || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!noteContent.trim() || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notesList: {
    gap: 8,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.accent}12`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timestampText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  noTimestampBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  noTimestampText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  noteDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  noteContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 28,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 12,
  },
  timestampToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  timestampToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestampToggleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VideoNotes;
