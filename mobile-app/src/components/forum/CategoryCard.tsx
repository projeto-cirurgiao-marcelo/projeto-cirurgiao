/**
 * Card de categoria do fórum
 * Exibe nome, descrição e contagem de tópicos
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ForumCategory } from '../../types';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../constants/colors';

interface CategoryCardProps {
  category: ForumCategory;
  onPress: (category: ForumCategory) => void;
}

export default function CategoryCard({ category, onPress }: CategoryCardProps) {
  const topicCount = category._count?.topics ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles-outline" size={20} color={Colors.accent} />
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        {category.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {category.description}
          </Text>
        ) : null}
        <Text style={styles.count}>
          {topicCount} {topicCount === 1 ? 'tópico' : 'tópicos'}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: FontSize.sm * 1.4,
  },
  count: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },
});
