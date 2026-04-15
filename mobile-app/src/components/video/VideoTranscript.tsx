import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { transcriptsService, Transcript, TranscriptSegment } from '../../services/api/transcripts.service';
import { Colors as colors } from '../../constants/colors';

interface VideoTranscriptProps {
  videoId: string;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

// Formata segundos para MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function VideoTranscript({ videoId, currentTime = 0, onSeek }: VideoTranscriptProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const lastScrolledIndex = useRef<number>(-1);

  useEffect(() => {
    loadTranscript();
  }, [videoId]);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      const data = await transcriptsService.getByVideoId(videoId);
      setTranscript(data);
    } catch (err) {
      console.error('Erro ao carregar transcrição:', err);
      setTranscript(null);
    } finally {
      setLoading(false);
    }
  };

  // Encontra o segmento atual baseado no tempo do vídeo
  const activeSegmentIndex = useMemo(() => {
    if (!transcript?.segments) return -1;

    for (let i = transcript.segments.length - 1; i >= 0; i--) {
      if (currentTime >= transcript.segments[i].startTime) {
        return i;
      }
    }
    return -1;
  }, [transcript?.segments, currentTime]);

  // Auto-scroll para o segmento ativo
  useEffect(() => {
    if (!autoScroll || activeSegmentIndex < 0 || !flatListRef.current || !transcript?.segments) {
      return;
    }

    // Só faz scroll se o índice mudou
    if (activeSegmentIndex === lastScrolledIndex.current) {
      return;
    }

    const ITEM_HEIGHT = 80;
    const HEADER_HEIGHT = 80;
    const targetOffset = Math.max(0, (activeSegmentIndex * ITEM_HEIGHT) - HEADER_HEIGHT);

    flatListRef.current.scrollToOffset({
      offset: targetOffset,
      animated: true,
    });

    lastScrolledIndex.current = activeSegmentIndex;
  }, [activeSegmentIndex, autoScroll, transcript?.segments]);

  // Handler para click no segmento
  const handleSegmentPress = useCallback(
    (segment: TranscriptSegment) => {
      if (onSeek) {
        onSeek(segment.startTime);
        setAutoScroll(true);
      }
    },
    [onSeek]
  );

  const renderSegment = useCallback(
    ({ item, index }: { item: TranscriptSegment; index: number }) => {
      const isActive = index === activeSegmentIndex;

      return (
        <TouchableOpacity
          style={[styles.segment, isActive && styles.segmentActive]}
          onPress={() => handleSegmentPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.timestamp, isActive && styles.timestampActive]}>
            <Ionicons
              name="time-outline"
              size={10}
              color={isActive ? '#fff' : colors.textMuted}
            />
            <Text style={[styles.timestampText, isActive && styles.timestampTextActive]}>
              {formatTime(item.startTime)}
            </Text>
          </View>
          <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
            {item.text}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeSegmentIndex, handleSegmentPress]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando transcrição...</Text>
      </View>
    );
  }

  if (!transcript || !transcript.segments || transcript.segments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
        <Text style={styles.emptyText}>Nenhuma transcrição disponível para esta aula.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com toggle de auto-scroll */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={16} color={colors.accent} />
          <Text style={styles.headerTitle}>Transcrição</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatTime(currentTime)}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.autoScrollLabel}>Auto-scroll</Text>
          <Switch
            value={autoScroll}
            onValueChange={setAutoScroll}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
            ios_backgroundColor={colors.border}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
        <Text style={styles.hintText}>Toque em um trecho para pular para esse momento</Text>
      </View>

      {/* Lista de segmentos */}
      <FlatList
        ref={flatListRef}
        data={transcript.segments}
        renderItem={renderSegment}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => setAutoScroll(false)}
        showsVerticalScrollIndicator={true}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoScrollLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  listContent: {
    padding: 6,
  },
  segment: {
    padding: 10,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: colors.accent + '10',
    borderColor: colors.accent,
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  timestampActive: {
    backgroundColor: colors.accent,
  },
  timestampText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.textMuted,
    fontWeight: '600',
  },
  timestampTextActive: {
    color: '#fff',
  },
  segmentText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '500',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
