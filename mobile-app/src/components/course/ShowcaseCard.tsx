/**
 * Card de vitrine do aluno ("Meus Cursos") — full-width, leva à listagem
 * das aulas da vitrine. Visual compacto na linha do CourseCardHome.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/colors';
import type { MyShowcase } from '../../services/api/showcases.service';

export function ShowcaseCard({ showcase }: { showcase: MyShowcase }) {
  return (
    <TouchableOpacity
      style={styles.container}
      // Cast: typed routes só conhecem a rota nova após o typegen do expo start
      onPress={() => router.push(`/courses/showcase/${showcase.slug}` as Href)}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrap}>
        {showcase.thumbnail ? (
          <Image source={{ uri: showcase.thumbnail }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="videocam-outline" size={30} color={Colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {showcase.title}
        </Text>
        {showcase.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {showcase.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="play-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.metaText}>
            {showcase.videoCount} aula{showcase.videoCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.chevron} />
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
  info: { flex: 1, gap: 2 },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
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
  chevron: { marginRight: 2 },
});
