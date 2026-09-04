/**
 * Card de vitrine BLOQUEADA (seção "Continue evoluindo") — provocação de
 * compra. Tocar no card abre a vitrine em modo prévia (índice das aulas,
 * cada uma assistível até `previewSeconds`) — a "visão do curso" antes do
 * checkout. O CTA "Como acessar?" abre a Central de Ajuda do web na
 * pergunta "Como desbloquear mais cursos?" daquela vitrine — é a página web
 * que aponta pro checkout, nunca o app (App Store 3.1.1). Sem checkoutUrl
 * (produto ainda não vendável) o CTA vira "Em breve", mas a prévia continua
 * acessível. Visual na linha do ShowcaseCard.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/colors';
import type { AvailableShowcase } from '../../services/api/showcases.service';

/**
 * Abre a Central de Ajuda (WebView) na pergunta de desbloqueio da vitrine.
 * Compartilhado com a tela de prévia e o overlay do player.
 */
export function openUnlockHelp(showcaseSlug: string): void {
  router.push(`/help?showcase=${encodeURIComponent(showcaseSlug)}` as Href);
}

export function LockedShowcaseCard({ showcase }: { showcase: AvailableShowcase }) {
  const openPreview = () => {
    router.push(`/courses/showcase/${showcase.slug}?locked=1` as Href);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={openPreview} activeOpacity={0.8}>
      <View style={styles.imageWrap}>
        {showcase.thumbnail ? (
          <Image source={{ uri: showcase.thumbnail }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="videocam-outline" size={30} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={11} color="#fff" />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {showcase.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="play-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.metaText}>
            Bloqueado · {showcase.videoCount} aula{showcase.videoCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {showcase.checkoutUrl ? (
          <TouchableOpacity
            style={styles.ctaRow}
            onPress={() => openUnlockHelp(showcase.slug)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Como acessar?</Text>
            <Ionicons name="help-circle-outline" size={13} color={Colors.accent} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.soonText}>Em breve</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  imageWrap: {
    width: 96,
    height: 64,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, gap: 2 },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 4,
  },
  ctaText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  soonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
