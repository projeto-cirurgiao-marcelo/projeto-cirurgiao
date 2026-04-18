/**
 * Tela do Fórum - Listagem de categorias com dados da API
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ForumCategory } from '../../src/types';
import { forumCategoriesService } from '../../src/services/api/forum-categories.service';
import { logger } from '../../src/lib/logger';
import CategoryCard from '../../src/components/forum/CategoryCard';
import { ForumCategorySkeleton } from '../../src/components/ui/Skeleton';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

export default function ForumScreen() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const data = await forumCategoriesService.getAll();
      setCategories(data);
    } catch (err) {
      logger.error('[ForumTab] Erro ao carregar categorias:', err);
      setError('Não foi possível carregar as categorias.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Recarrega ao focar na tela
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCategories(false);
  };

  const handleCategoryPress = (category: ForumCategory) => {
    router.push(`/forum/category/${category.id}` as any);
  };

  // Estado de loading com skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Fórum</Text>
          <Text style={styles.subtitle}>
            Tire dúvidas e compartilhe conhecimento
          </Text>
        </View>
        <View style={{ padding: Spacing.lg }}>
          <ForumCategorySkeleton />
          <ForumCategorySkeleton />
          <ForumCategorySkeleton />
          <ForumCategorySkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Fórum</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={Colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
          <Text
            style={styles.retryText}
            onPress={() => loadCategories()}
          >
            Tentar novamente
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Estado vazio
  if (categories.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Fórum</Text>
          <Text style={styles.subtitle}>
            Tire dúvidas e compartilhe conhecimento
          </Text>
        </View>
        <View style={styles.centered}>
          <Ionicons
            name="chatbubbles-outline"
            size={32}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyText}>
            Nenhuma categoria disponível ainda.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CategoryCard category={item} onPress={handleCategoryPress} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Fórum</Text>
            <Text style={styles.subtitle}>
              Tire dúvidas e compartilhe conhecimento
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.accent]}
            tintColor={Colors.accent}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
