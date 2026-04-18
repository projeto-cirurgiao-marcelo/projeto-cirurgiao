/**
 * Detalhe de um tópico do fórum
 * Exibe conteúdo completo, votos, badges, respostas e campo para responder
 * Ações: excluir (autor/admin), marcar resolvido (autor), denunciar (todos)
 */

import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ForumTopic, ForumReply, ReportReason } from '../../../src/types';
import { forumService } from '../../../src/services/api/forum.service';
import { getErrorMessage } from '../../../src/services/api/client';
import { logger } from '../../../src/lib/logger';
import useAuthStore from '../../../src/stores/auth-store';
import VoteButtons from '../../../src/components/forum/VoteButtons';
import ReplyCard from '../../../src/components/forum/ReplyCard';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../../src/constants/colors';

/** Formata data relativa */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min atrás`;
  if (diffHour < 24) return `${diffHour}h atrás`;
  if (diffDay < 30) return `${diffDay}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'INAPPROPRIATE', label: 'Conteúdo inapropriado' },
  { value: 'OFFENSIVE', label: 'Linguagem ofensiva' },
  { value: 'OFF_TOPIC', label: 'Fora do tópico' },
  { value: 'OTHER', label: 'Outro motivo' },
];

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const user = useAuthStore((s) => s.user);

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resposta
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const replyInputRef = useRef<TextInput>(null);

  // Modais de ação
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const isAuthor = user?.id === topic?.authorId;
  const isAdmin = user?.role === 'ADMIN';
  const canDelete = isAuthor || isAdmin;
  const canMarkSolved = isAuthor;

  const loadTopic = async (showLoader = true) => {
    if (!topicId) return;
    if (showLoader) setIsLoading(true);
    setError(null);

    try {
      const data = await forumService.getTopicById(topicId);
      setTopic(data);
    } catch (err) {
      logger.error('[ForumTopic] Erro ao carregar tópico:', err);
      setError('Não foi possível carregar o tópico.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTopic();
    }, [topicId])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTopic(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !topicId || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await forumService.createReply({
        content: replyText.trim(),
        topicId,
      });
      setReplyText('');
      replyInputRef.current?.blur();
      await loadTopic(false);
    } catch (err) {
      const message = getErrorMessage(err);
      Alert.alert('Erro', message || 'Não foi possível enviar a resposta.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await forumService.deleteReply(replyId);
      setTopic((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          replies: prev.replies?.filter((r) => r.id !== replyId),
          _count: prev._count
            ? { ...prev._count, replies: (prev._count.replies || 0) - 1 }
            : prev._count,
        };
      });
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível excluir a resposta.');
    }
  };

  // ---- Ações do tópico ----

  const handleDeleteTopic = () => {
    setShowActionsMenu(false);
    Alert.alert(
      'Excluir tópico',
      'Tem certeza que deseja excluir este tópico? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await forumService.deleteTopic(topicId!);
              Alert.alert('Sucesso', 'Tópico excluído com sucesso.');
              router.back();
            } catch (err) {
              const message = getErrorMessage(err);
              Alert.alert('Erro', message || 'Não foi possível excluir o tópico.');
            }
          },
        },
      ]
    );
  };

  const handleToggleSolved = async () => {
    setShowActionsMenu(false);
    if (!topic) return;

    try {
      const updated = await forumService.updateTopic(topicId!, {
        isSolved: !topic.isSolved,
      });
      setTopic((prev) => (prev ? { ...prev, isSolved: updated.isSolved } : prev));
      Alert.alert(
        'Sucesso',
        updated.isSolved
          ? 'Tópico marcado como resolvido.'
          : 'Tópico desmarcado como resolvido.'
      );
    } catch (err) {
      const message = getErrorMessage(err);
      Alert.alert('Erro', message || 'Não foi possível atualizar o tópico.');
    }
  };

  const handleOpenReport = () => {
    setShowActionsMenu(false);
    setSelectedReason(null);
    setReportDescription('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReason || !topicId) return;

    setIsSubmittingReport(true);
    try {
      await forumService.reportTopic({
        topicId,
        reason: selectedReason,
        description: reportDescription.trim() || undefined,
      });
      setShowReportModal(false);
      Alert.alert(
        'Denúncia enviada',
        'Sua denúncia foi registrada e será analisada pela equipe de moderação.'
      );
    } catch (err) {
      const message = getErrorMessage(err);
      if (message?.includes('ja denunciou')) {
        Alert.alert('Aviso', 'Você já denunciou este tópico anteriormente.');
      } else {
        Alert.alert('Erro', message || 'Não foi possível enviar a denúncia.');
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carregando...</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error || !topic) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Erro</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={Colors.danger}
          />
          <Text style={styles.errorText}>
            {error || 'Tópico não encontrado.'}
          </Text>
          <Text style={styles.retryText} onPress={() => loadTopic()}>
            Tentar novamente
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const replies = topic.replies || [];
  const replyCount = topic._count?.replies ?? replies.length;

  // Render do header do tópico (dentro do FlatList como ListHeaderComponent)
  const renderTopicHeader = () => (
    <View style={styles.topicContainer}>
      {/* Badges */}
      {(topic.isPinned || topic.isClosed || topic.isSolved) && (
        <View style={styles.badges}>
          {topic.isPinned && (
            <View style={[styles.badge, styles.badgePinned]}>
              <Ionicons name="pin" size={12} color={Colors.warning} />
              <Text style={[styles.badgeLabel, { color: Colors.warning }]}>
                Fixado
              </Text>
            </View>
          )}
          {topic.isSolved && (
            <View style={[styles.badge, styles.badgeSolved]}>
              <Ionicons
                name="checkmark-circle"
                size={12}
                color={Colors.success}
              />
              <Text style={[styles.badgeLabel, { color: Colors.success }]}>
                Resolvido
              </Text>
            </View>
          )}
          {topic.isClosed && (
            <View style={[styles.badge, styles.badgeClosed]}>
              <Ionicons name="lock-closed" size={12} color={Colors.textMuted} />
              <Text style={[styles.badgeLabel, { color: Colors.textMuted }]}>
                Fechado
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Titulo */}
      <Text style={styles.topicTitle}>{topic.title}</Text>

      {/* Autor + data */}
      <View style={styles.topicMeta}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(topic.author.name)}
          </Text>
        </View>
        <View>
          <Text style={styles.authorName}>{topic.author.name}</Text>
          <Text style={styles.topicDate}>
            {formatRelativeTime(topic.createdAt)}
          </Text>
        </View>
      </View>

      {/* Conteudo */}
      <Text style={styles.topicContent}>{topic.content}</Text>

      {/* Stats + Votos */}
      <View style={styles.topicFooter}>
        <VoteButtons
          type="topic"
          id={topic.id}
          initialUpvotes={topic.upvotes}
          initialDownvotes={topic.downvotes}
        />
        <View style={styles.topicStats}>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.statText}>{topic.views}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={Colors.textMuted}
            />
            <Text style={styles.statText}>{replyCount}</Text>
          </View>
        </View>
      </View>

      {/* Separador de respostas */}
      <View style={styles.repliesHeader}>
        <Text style={styles.repliesTitle}>
          {replyCount} {replyCount === 1 ? 'Resposta' : 'Respostas'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {topic.category?.name ?? 'Tópico'}
          </Text>
        </View>
        {/* Botão de ações "..." */}
        <TouchableOpacity
          onPress={() => setShowActionsMenu(true)}
          style={styles.moreButton}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Lista de respostas com header do topico */}
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReplyCard
              reply={item}
              currentUserId={user?.id}
              onDelete={handleDeleteReply}
              onVoteChange={() => loadTopic(false)}
            />
          )}
          ListHeaderComponent={renderTopicHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.accent]}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyReplies}>
              <Text style={styles.emptyText}>
                Nenhuma resposta ainda. Seja o primeiro!
              </Text>
            </View>
          }
        />

        {/* Input de resposta (se tópico não está fechado) */}
        {!topic.isClosed && (
          <View style={styles.replyBar}>
            <TextInput
              ref={replyInputRef}
              style={styles.replyInput}
              placeholder="Escreva uma resposta..."
              placeholderTextColor={Colors.inputPlaceholder}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={5000}
              editable={!isSendingReply}
            />
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!replyText.trim() || isSendingReply}
              style={[
                styles.sendButton,
                (!replyText.trim() || isSendingReply) &&
                  styles.sendButtonDisabled,
              ]}
            >
              {isSendingReply ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ---- Modal de ações ---- */}
      <Modal
        visible={showActionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View
            style={styles.actionsSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />

            {/* Marcar como resolvido (apenas autor) */}
            {canMarkSolved && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleToggleSolved}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons
                    name={topic.isSolved ? 'close-circle-outline' : 'checkmark-circle-outline'}
                    size={20}
                    color={Colors.success}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionLabel}>
                    {topic.isSolved ? 'Desmarcar resolvido' : 'Marcar como resolvido'}
                  </Text>
                  <Text style={styles.actionDesc}>
                    {topic.isSolved
                      ? 'Remover marcação de resolvido deste tópico'
                      : 'Indicar que sua dúvida foi respondida'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Excluir (autor ou admin) */}
            {canDelete && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleDeleteTopic}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.danger + '15' }]}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionLabel, { color: Colors.danger }]}>
                    Excluir tópico
                  </Text>
                  <Text style={styles.actionDesc}>
                    Remover permanentemente este tópico e suas respostas
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Denunciar (todos podem, exceto o autor) */}
            {!isAuthor && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleOpenReport}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '15' }]}>
                  <Ionicons name="flag-outline" size={20} color={Colors.warning} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionLabel}>Denunciar</Text>
                  <Text style={styles.actionDesc}>
                    Reportar conteúdo inadequado para a moderação
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cancelar */}
            <TouchableOpacity
              style={[styles.actionItem, styles.actionCancel]}
              onPress={() => setShowActionsMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ---- Modal de denúncia ---- */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View
            style={styles.reportSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.reportTitle}>Denunciar tópico</Text>
            <Text style={styles.reportSubtitle}>
              Selecione o motivo da denúncia
            </Text>

            {/* Motivos */}
            {REPORT_REASONS.map((item) => {
              const isSelected = selectedReason === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.reasonItem,
                    isSelected && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReason(item.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? Colors.accent : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.reasonLabel,
                      isSelected && styles.reasonLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Descrição opcional */}
            <TextInput
              style={styles.reportInput}
              placeholder="Descrição adicional (opcional)"
              placeholderTextColor={Colors.inputPlaceholder}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              maxLength={500}
              editable={!isSubmittingReport}
            />

            {/* Botões */}
            <View style={styles.reportButtons}>
              <TouchableOpacity
                style={styles.reportCancelBtn}
                onPress={() => setShowReportModal(false)}
                disabled={isSubmittingReport}
              >
                <Text style={styles.reportCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportSubmitBtn,
                  (!selectedReason || isSubmittingReport) && styles.reportSubmitDisabled,
                ]}
                onPress={handleSubmitReport}
                disabled={!selectedReason || isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.reportSubmitText}>Enviar denúncia</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 34,
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: Spacing['2xl'],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },

  // ---- Tópico ----
  topicContainer: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgePinned: {
    backgroundColor: Colors.warning + '15',
  },
  badgeSolved: {
    backgroundColor: Colors.success + '15',
  },
  badgeClosed: {
    backgroundColor: Colors.background,
  },
  badgeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  topicTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: FontSize.xl * 1.35,
    marginBottom: Spacing.md,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  authorName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  topicDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  topicContent: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: FontSize.md * 1.6,
    marginBottom: Spacing.lg,
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  topicStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },

  // ---- Respostas ----
  repliesHeader: {
    paddingTop: Spacing.xl,
    marginTop: Spacing.md,
  },
  repliesTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  emptyReplies: {
    padding: Spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // ---- Input de resposta ----
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
    gap: Spacing.sm,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.inputText,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // ---- Modal overlay ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },

  // ---- Menu de ações ----
  actionsSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing['3xl'],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  actionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionCancel: {
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  actionCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ---- Modal de denúncia ----
  reportSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing['3xl'],
    maxHeight: '80%',
  },
  reportTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  reportSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  reasonItemSelected: {
    backgroundColor: Colors.accentSoft,
  },
  reasonLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  reasonLabelSelected: {
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  reportInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.inputText,
    minHeight: 80,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    textAlignVertical: 'top',
  },
  reportButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  reportCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  reportSubmitBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.danger,
    alignItems: 'center',
  },
  reportSubmitDisabled: {
    opacity: 0.5,
  },
  reportSubmitText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
