import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/colors';
import { livesSavedService, SPECIES_LABEL, STATUS_LABEL, type Story } from '../../src/services/api/lives-saved.service';
import { compactDate } from '../../src/lib/lives-saved-format';
import { logger } from '../../src/lib/logger';

const QUESTION = 'Por que você atribui essa vida salva a algo que aprendeu no Projeto Cirurgião?';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    livesSavedService
      .story(id)
      .then((s) => { setStory(s); setState('ok'); })
      .catch((err) => { logger.error('[livesSaved] story falhou', err); setState('missing'); });
  }, [id]);

  const initials = (story?.reporterDisplay ?? '')
    .replace(/^Dr[a]?\.\s*/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/lives-saved'))} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vida salva</Text>
        <View style={{ width: 36 }} />
      </View>

      {state === 'loading' ? (
        <ActivityIndicator style={{ marginTop: Spacing['4xl'] }} color={Colors.accent} />
      ) : state === 'missing' || !story ? (
        <View style={styles.content}>
          <Text style={styles.empty}>Relato não encontrado. Ele pode ter sido removido ou o autor não autorizou a exibição.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>
            {(story.species ? SPECIES_LABEL[story.species] : 'Espécie não informada').toUpperCase()}
            {story.animalName ? ` · ${story.animalName.toUpperCase()}` : ''}
            {story.occurredAt ? ` · ${compactDate(story.occurredAt)}` : ''}
            {story.isMine && story.status !== 'APPROVED' ? ` · ${STATUS_LABEL[story.status].toUpperCase()}` : ''}
          </Text>
          {story.procedureSummary ? <Text style={styles.title}>{story.procedureSummary}</Text> : null}

          <View style={styles.who}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials || '?'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.whoName}>{story.reporterDisplay}</Text>
              <Text style={styles.whoRole}>
                {[story.reporterCrmv, story.reporterTitle].filter(Boolean).join(' · ') || 'Médico(a) veterinário(a)'}
              </Text>
            </View>
          </View>

          {story.isMine && story.status === 'REJECTED' && story.rejectionReason ? (
            <View style={styles.rejected}>
              <Text style={styles.rejectedLabel}>DEVOLVIDO PELA MODERAÇÃO</Text>
              <Text style={styles.body}>{story.rejectionReason}</Text>
              <TouchableOpacity onPress={() => router.push(`/lives-saved/edit/${story.id}`)}>
                <Text style={styles.link}>Editar e reenviar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.question}>{QUESTION}</Text>
          <Text style={styles.body}>{story.attribution}</Text>

          {story.media.length > 0 && (
            <View style={styles.media}>
              {story.media.map((m) =>
                m.kind === 'VIDEO' ? (
                  <VideoTile key={m.id} url={m.url} />
                ) : (
                  <Image key={m.id} source={{ uri: m.url }} style={styles.mediaItem} resizeMode="cover" accessibilityLabel={m.caption ?? 'Foto do relato'} />
                ),
              )}
            </View>
          )}

          <TouchableOpacity style={styles.cta} onPress={() => router.replace('/lives-saved')}>
            <Text style={styles.ctaText}>Ver outras histórias</Text>
          </TouchableOpacity>
          <View style={{ height: Spacing['4xl'] }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function VideoTile({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return <VideoView player={player} style={styles.mediaItem} contentFit="cover" nativeControls />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  content: { padding: Spacing['2xl'] },
  eyebrow: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium, letterSpacing: 0.6 },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text, lineHeight: FontSize['2xl'] * 1.2, marginTop: Spacing.xs },
  who: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginVertical: Spacing.lg,
  },
  avatar: { width: 40, height: 40, borderRadius: BorderRadius.full, backgroundColor: Colors.accentSoft, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.accentDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  whoName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  whoRole: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rejected: { borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.xs },
  rejectedLabel: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold, letterSpacing: 0.6 },
  link: { color: Colors.accent, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  question: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  body: { fontSize: FontSize.base, lineHeight: FontSize.base * 1.5, color: Colors.text },
  media: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  mediaItem: { width: '48%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md, backgroundColor: Colors.accentSoft, overflow: 'hidden' },
  cta: { marginTop: Spacing['2xl'], backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
  ctaText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.base },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary },
});
