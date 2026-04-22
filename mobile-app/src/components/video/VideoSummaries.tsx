import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  summariesService,
  VideoSummary,
  RemainingGenerationsResponse,
} from '../../services/api/summaries.service';
import { logger } from '../../lib/logger';
import { Colors as colors } from '../../constants/colors';

interface VideoSummariesProps {
  videoId: string;
}

export function VideoSummaries({ videoId }: VideoSummariesProps) {
  const [summaries, setSummaries] = useState<VideoSummary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<VideoSummary | null>(null);
  const [remaining, setRemaining] = useState<RemainingGenerationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [videoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summariesData, remainingData] = await Promise.all([
        summariesService.listSummaries(videoId),
        summariesService.getRemainingGenerations(videoId),
      ]);

      setSummaries(summariesData.summaries || []);
      setRemaining(remainingData);

      // Seleciona o primeiro resumo se existir
      if (summariesData.summaries && summariesData.summaries.length > 0) {
        setSelectedSummary(summariesData.summaries[0]);
      }
    } catch (err) {
      logger.error('Erro ao carregar resumos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = useCallback(async () => {
    if (!remaining || remaining.remaining <= 0) {
      Alert.alert(
        'Limite atingido',
        'Você atingiu o limite de resumos gerados para este vídeo.'
      );
      return;
    }

    try {
      setGenerating(true);
      const newSummary = await summariesService.generateSummary(videoId);
      setSummaries((prev) => [newSummary, ...prev]);
      setSelectedSummary(newSummary);
      setRemaining((prev) =>
        prev ? { ...prev, remaining: newSummary.remainingGenerations } : null
      );
    } catch (error) {
      logger.error('Erro ao gerar resumo:', error);
      Alert.alert('Erro', 'Não foi possível gerar o resumo. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, [videoId, remaining]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando resumos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.headerTitle}>Resumos IA</Text>
        </View>
        {remaining && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {remaining.remaining}/{remaining.maxAllowed} restantes
            </Text>
          </View>
        )}
      </View>

      {/* Botão de gerar */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          (generating || (remaining && remaining.remaining <= 0)) &&
            styles.generateButtonDisabled,
        ]}
        onPress={handleGenerateSummary}
        disabled={generating || (remaining !== null && remaining.remaining <= 0)}
        activeOpacity={0.8}
      >
        {generating ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.generateButtonText}>Gerando resumo...</Text>
          </>
        ) : (
          <>
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.generateButtonText}>Gerar Novo Resumo</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Lista de resumos existentes */}
      {summaries.length > 0 && (
        <View style={styles.summariesList}>
          <Text style={styles.sectionTitle}>Seus Resumos</Text>
          {summaries.map((summary, index) => (
            <TouchableOpacity
              key={summary.id}
              style={[
                styles.summaryItem,
                selectedSummary?.id === summary.id && styles.summaryItemSelected,
              ]}
              onPress={() => setSelectedSummary(summary)}
              activeOpacity={0.7}
            >
              <View style={styles.summaryItemHeader}>
                <Text style={styles.summaryItemTitle}>
                  Resumo v{summary.version}
                </Text>
                {index === 0 && (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>Mais recente</Text>
                  </View>
                )}
              </View>
              <Text style={styles.summaryItemDate}>
                {formatDate(summary.createdAt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Conteúdo do resumo selecionado */}
      {selectedSummary ? (
        <View style={styles.summaryContent}>
          <View style={styles.summaryContentHeader}>
            <Text style={styles.sectionTitle}>
              Resumo v{selectedSummary.version}
            </Text>
            <Text style={styles.summaryDate}>
              {formatDate(selectedSummary.createdAt)}
            </Text>
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryText}>{selectedSummary.content}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum resumo disponível</Text>
          <Text style={styles.emptyText}>
            Gere um resumo com IA para facilitar seus estudos!
          </Text>
        </View>
      )}
    </ScrollView>
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
  badge: {
    backgroundColor: colors.accent + '12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    marginBottom: 14,
  },
  generateButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  summariesList: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  summaryItem: {
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 6,
  },
  summaryItemSelected: {
    borderColor: colors.accent,
    borderWidth: 1,
    backgroundColor: colors.accent + '08',
  },
  summaryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  latestBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  latestBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  summaryItemDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryContent: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summaryDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  summaryTextContainer: {
    paddingTop: 2,
  },
  summaryText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
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
});

export default VideoSummaries;
