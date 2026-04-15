import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../../types/gamification.types';
import type { Challenge } from '../../types/gamification.types';

interface ChallengeCardProps {
  challenge: Challenge;
  onClaim?: (id: string) => void;
  isClaiming?: boolean;
}

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expirado';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function ChallengeCard({ challenge, onClaim, isClaiming }: ChallengeCardProps) {
  const isCompleted = challenge.status === 'completed' && !challenge.claimedAt;
  const isClaimed = !!challenge.claimedAt;
  const isExpired = challenge.status === 'expired';
  const isActive = challenge.status === 'active';
  const diffColor = DIFFICULTY_COLORS[challenge.difficulty];
  const diffLabel = DIFFICULTY_LABELS[challenge.difficulty];
  const progressPercent = challenge.target > 0
    ? Math.min((challenge.current / challenge.target) * 100, 100)
    : 0;

  return (
    <View style={[styles.card, isClaimed && styles.cardClaimed]}>
      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: isClaimed || isCompleted ? colors.success + '15' : colors.accent + '12' }]}>
        <Ionicons
          name={isClaimed ? 'checkmark-done-circle' : isCompleted ? 'checkmark-circle' : 'flag-outline'}
          size={20}
          color={isClaimed || isCompleted ? colors.success : colors.accent}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isClaimed && styles.titleClaimed]} numberOfLines={1}>
            {challenge.title}
          </Text>
          <View style={[styles.difficultyBadge, { backgroundColor: diffColor + '15' }]}>
            <Text style={[styles.difficultyText, { color: diffColor }]}>{diffLabel}</Text>
          </View>
        </View>

        {challenge.description ? (
          <Text style={styles.description} numberOfLines={1}>{challenge.description}</Text>
        ) : null}

        {/* Progress bar */}
        {isActive && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{challenge.current}/{challenge.target}</Text>
          </View>
        )}

        {/* Bottom row: time + XP */}
        <View style={styles.bottomRow}>
          {!isClaimed && !isExpired && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.timeText}>{formatTimeRemaining(challenge.expiresAt)}</Text>
            </View>
          )}
          {isExpired && <Text style={styles.expiredText}>Expirado</Text>}
          {isClaimed && <Text style={styles.claimedText}>Coletado</Text>}

          <View style={styles.xpBadge}>
            <Ionicons name="sparkles" size={11} color="#D97706" />
            <Text style={styles.xpText}>+{challenge.xpReward} XP</Text>
          </View>
        </View>
      </View>

      {/* Claim button */}
      {isCompleted && onClaim && (
        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => onClaim(challenge.id)}
          disabled={isClaiming}
          activeOpacity={0.8}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.claimText}>Coletar!</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  cardClaimed: {
    opacity: 0.6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
  },
  titleClaimed: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    flex: 1,
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
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  expiredText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '500',
  },
  claimedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  claimButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  claimText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
