import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import type { LibrarySource } from '../../types/library.types';

export function LibrarySourceChip({ source }: { source: LibrarySource }) {
  const pageRange =
    source.pageStart != null && source.pageEnd != null
      ? `p. ${source.pageStart}-${source.pageEnd}`
      : source.pageStart != null
        ? `p. ${source.pageStart}`
        : null;

  return (
    <View style={styles.chip}>
      <Ionicons name="book-outline" size={11} color={colors.accent} />
      <Text style={styles.title} numberOfLines={1}>
        {source.documentTitle}
      </Text>
      {source.chapter && (
        <Text style={styles.detail} numberOfLines={1}>
          {source.chapter}
        </Text>
      )}
      {pageRange && (
        <Text style={styles.page}>{pageRange}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.accent}10`,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 1,
  },
  title: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '500',
    maxWidth: 120,
  },
  detail: {
    fontSize: 10,
    color: colors.textMuted,
    maxWidth: 80,
  },
  page: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },
});
