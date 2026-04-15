import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LeaderboardEntry } from '../../types/gamification.types';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze
const PODIUM_HEIGHTS = [120, 96, 80]; // 1st, 2nd, 3rd (display order: 2-1-3)

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  if (entries.length < 3) return null;

  // Display order: 2nd, 1st, 3rd
  const order = [entries[1], entries[0], entries[2]];
  const heights = [PODIUM_HEIGHTS[1], PODIUM_HEIGHTS[0], PODIUM_HEIGHTS[2]];
  const medals = [1, 0, 2]; // index into MEDAL_COLORS

  return (
    <View style={styles.container}>
      {order.map((entry, i) => (
        <View key={entry.userId} style={styles.column}>
          {/* Avatar */}
          <View style={[styles.avatarCircle, { borderColor: MEDAL_COLORS[medals[i]] }]}>
            <Text style={styles.avatarText}>
              {entry.displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
            {medals[i] === 0 && (
              <View style={styles.crownBadge}>
                <Ionicons name="diamond" size={12} color="#FFD700" />
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.name} numberOfLines={1}>{entry.displayName}</Text>

          {/* Level */}
          <View style={[styles.levelBadge, { backgroundColor: entry.levelColor + '20' }]}>
            <Text style={[styles.levelText, { color: entry.levelColor }]}>
              Lv.{entry.level}
            </Text>
          </View>

          {/* Podium block */}
          <View style={[styles.podiumBlock, { height: heights[i], backgroundColor: MEDAL_COLORS[medals[i]] + '20' }]}>
            <Text style={[styles.rank, { color: MEDAL_COLORS[medals[i]] }]}>
              {entry.rank}°
            </Text>
            <Text style={styles.xp}>{formatXp(entry.xpEarned)} XP</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    maxWidth: 80,
    textAlign: 'center',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  rank: {
    fontSize: 22,
    fontWeight: '800',
  },
  xp: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
});
