import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import type { ChatSource } from '../../types/chat.types';

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function SourceChip({ source }: { source: ChatSource }) {
  return (
    <View style={styles.sourceChip}>
      <Ionicons name="videocam-outline" size={11} color={colors.accent} />
      <Text style={styles.sourceChipText} numberOfLines={1}>
        {source.videoTitle || 'Video'}
      </Text>
      <Text style={styles.sourceChipTime}>
        {formatTimestamp(source.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.accent}10`,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceChipText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '500',
    maxWidth: 100,
  },
  sourceChipTime: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },
});
