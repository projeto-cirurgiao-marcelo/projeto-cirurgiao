import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import { RARITY_COLORS, RARITY_LABELS, resolveBadgeIcon } from '../../types/gamification.types';
import type { Badge } from '../../types/gamification.types';

interface BadgeCardProps {
  badge: Badge;
  onPress?: () => void;
}

export function BadgeCard({ badge, onPress }: BadgeCardProps) {
  const isUnlocked = !!badge.unlockedAt;
  const rarityColor = RARITY_COLORS[badge.rarity];
  const rarityLabel = RARITY_LABELS[badge.rarity];
  const iconName = resolveBadgeIcon(badge.icon) as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnlocked && { borderColor: rarityColor.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Rarity pill */}
      <View style={[styles.rarityPill, { backgroundColor: rarityColor.bg }]}>
        <Text style={[styles.rarityText, { color: rarityColor.text }]}>{rarityLabel}</Text>
      </View>

      {/* Icon */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isUnlocked ? rarityColor.bg : '#F3F4F6',
            borderColor: isUnlocked ? rarityColor.border : '#E5E7EB',
          },
        ]}
      >
        {isUnlocked ? (
          <Ionicons name={iconName} size={24} color={rarityColor.text} />
        ) : (
          <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
        )}
      </View>

      {/* Name */}
      <Text style={[styles.name, !isUnlocked && styles.nameDisabled]} numberOfLines={2}>
        {badge.name}
      </Text>

      {/* Status */}
      {isUnlocked ? (
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.statusUnlocked}>Desbloqueada</Text>
        </View>
      ) : badge.progress ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(badge.progress.percent, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {badge.progress.current}/{badge.progress.target}
          </Text>
        </View>
      ) : (
        <Text style={styles.statusLocked}>Bloqueada</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  rarityPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 17,
  },
  nameDisabled: {
    color: '#9CA3AF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusUnlocked: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  statusLocked: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  progressContainer: {
    width: '100%',
    gap: 3,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
});
