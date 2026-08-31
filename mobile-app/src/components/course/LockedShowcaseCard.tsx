/**
 * Card de vitrine BLOQUEADA (seção "Continue evoluindo") — provocação de
 * compra, espelha o AtlasLockedShowcaseCard do web. Aponta pro checkout
 * TheMembers no navegador externo; sem checkoutUrl o card aparece inerte
 * ("Em breve", produto ainda não vendável). Visual na linha do ShowcaseCard.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/colors';
import { logger } from '../../lib/logger';
import type { AvailableShowcase } from '../../services/api/showcases.service';

export function LockedShowcaseCard({ showcase }: { showcase: AvailableShowcase }) {
  const handlePress = async () => {
    if (!showcase.checkoutUrl) return;
    try {
      const supported = await Linking.canOpenURL(showcase.checkoutUrl);
      if (supported) {
        await Linking.openURL(showcase.checkoutUrl);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir a página de compra.');
      }
    } catch (err) {
      logger.error('[LockedShowcaseCard] Erro ao abrir checkout:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao abrir a página de compra.');
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={!showcase.checkoutUrl}
    >
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
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>Desbloquear</Text>
            <Ionicons name="open-outline" size={12} color={Colors.accent} />
          </View>
        ) : (
          <Text style={styles.soonText}>Em breve</Text>
        )}
      </View>
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
