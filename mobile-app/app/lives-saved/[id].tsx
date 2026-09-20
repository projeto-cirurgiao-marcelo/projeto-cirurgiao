/** Ficha de uma vida salva (direção C): nº, carimbo, ficha de campos, relato, mídia, assinatura. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/colors';
import { livesSavedService, SPECIES_LABEL, STATUS_LABEL, type Story } from '../../src/services/api/lives-saved.service';
import { MONO, padSeq } from '../../src/components/lives-saved/LivesSavedBanner';
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

  const approved = story?.status === 'APPROVED';

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
        <View style={styles.content}><Text style={styles.empty}>Relato não encontrado. Ele pode ter sido removido ou o autor não autorizou a exibição.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.top}>
            <Text style={styles.num}><Text style={styles.numLabel}>Nº </Text>{approved ? padSeq(story.seq) : '····'}</Text>
            {approved ? (
              <View style={styles.stamp}><Text style={styles.stampText}>Aprovado · {compactDate(story.approvedAt)}</Text></View>
            ) : story.isMine ? (
              <Text style={styles.status}>{STATUS_LABEL[story.status].toUpperCase()}</Text>
            ) : null}
          </View>

          <View style={styles.ficha}>
            <Field label="Espécie" value={[story.species ? SPECIES_LABEL[story.species] : null, story.animalName].filter(Boolean).join(' · ') || '—'} />
            <Field label="Procedimento" value={story.procedureSummary || '—'} />
            <Field label="Data do caso" value={story.occurredAt ? story.occurredAt.slice(0, 10) : '—'} mono />
            <Field label="Responsável" value={story.reporterCrmv ?? 'CRMV reservado'} mono />
          </View>

          {story.isMine && story.status === 'REJECTED' && story.rejectionReason ? (
            <View style={styles.rejected}>
              <Text style={styles.rejectedLabel}>DEVOLVIDO PELA MODERAÇÃO</Text>
              <Text style={styles.body}>{story.rejectionReason}</Text>
              <TouchableOpacity onPress={() => router.push(`/lives-saved/edit/${story.id}`)}><Text style={styles.link}>Editar e reenviar</Text></TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.question}>{QUESTION}</Text>
          <Text style={styles.body}>{story.attribution}</Text>

          {story.media.length > 0 && (
            <View style={styles.media}>
              {story.media.map((m) =>
                m.kind === 'VIDEO' ? <VideoTile key={m.id} url={m.url} /> : (
                  <Image key={m.id} source={{ uri: m.url }} style={styles.mediaItem} resizeMode="cover" accessibilityLabel={m.caption ?? 'Foto do relato'} />
                ),
              )}
            </View>
          )}

          <Text style={styles.sign}>
            Assinado por <Text style={styles.signName}>{[story.reporterDisplay, story.reporterTitle].filter(Boolean).join(', ') || 'Médico(a) veterinário(a)'}</Text>
            {story.reporterCrmv ? <Text style={styles.signCrmv}> · {story.reporterCrmv}</Text> : null}.
          </Text>

          <TouchableOpacity style={styles.cta} onPress={() => router.replace('/lives-saved')}>
            <Text style={styles.ctaText}>Ver o registro</Text>
          </TouchableOpacity>
          <View style={{ height: Spacing['4xl'] }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.fieldValue, mono && { fontFamily: MONO, fontSize: FontSize.sm }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function VideoTile({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return <VideoView player={player} style={styles.mediaItem} contentFit="cover" nativeControls />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  content: { padding: Spacing['2xl'] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, flexWrap: 'wrap' },
  num: { fontFamily: MONO, fontSize: FontSize['3xl'], fontWeight: FontWeight.semibold, color: Colors.text, fontVariant: ['tabular-nums'] },
  numLabel: { fontSize: FontSize.sm, letterSpacing: 1.5, color: Colors.textSecondary },
  stamp: { borderWidth: 1.5, borderColor: Colors.success, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2, transform: [{ rotate: '-2deg' }] },
  stampText: { color: Colors.success, fontSize: 10, letterSpacing: 1.5, fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  status: { fontSize: FontSize.xs, letterSpacing: 1, color: Colors.warning, fontWeight: FontWeight.semibold },
  ficha: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: Colors.textMuted, borderRadius: BorderRadius.sm, marginVertical: Spacing.md, backgroundColor: Colors.card },
  field: { width: '50%', padding: Spacing.sm + 2, borderColor: Colors.border, borderWidth: 0.5 },
  fieldLabel: { fontSize: 10, letterSpacing: 1, color: Colors.textMuted, marginBottom: 2 },
  fieldValue: { fontSize: FontSize.md, color: Colors.text },
  rejected: { borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.xs, backgroundColor: Colors.warningLight },
  rejectedLabel: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold, letterSpacing: 0.6 },
  link: { color: Colors.accent, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  question: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, marginTop: Spacing.md, marginBottom: Spacing.sm },
  body: { fontSize: FontSize.base, lineHeight: FontSize.base * 1.5, color: Colors.text },
  media: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  mediaItem: { width: '48%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md, backgroundColor: Colors.accentSoft, overflow: 'hidden' },
  sign: { marginTop: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, fontSize: FontSize.sm, color: Colors.textSecondary },
  signName: { color: Colors.text, fontWeight: FontWeight.semibold },
  signCrmv: { fontFamily: MONO, fontSize: FontSize.xs },
  cta: { marginTop: Spacing['2xl'], backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
  ctaText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.base },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary },
});
