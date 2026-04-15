/**
 * Lista de tópicos de uma categoria do fórum
 * Exibe tópicos com paginação, pull-to-refresh e botão criar novo
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ForumCategory, ForumTopic } from '../../../../src/types';
import { forumCategoriesService } from '../../../../src/services/api/forum-categories.service';
import { forumService } from '../../../../src/services/api/forum.service';
import TopicCard from '../../../../src/components/forum/TopicCard';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../../../src/constants/colors';

export default function CategoryTopicsScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async (pageNum = 1, showLoader = true) => {
    if (!categoryId) return;
    if (showLoader) setIsLoading(true);
    setError(null);

    try {
      const [catData, topicsData] = await Promise.all([
        pageNum === 1
          ? forumCategoriesService.getById(categoryId)
          : Promise.resolve(category),
        forumService.getTopics({ categoryId, page: pageNum, limit: 15 }),
      ]);

      if (pageNum === 1) {
        setCategory(catData);
        setTopics(topicsData.data);
      } else {
        setTopics((prev) => [...prev, ...topicsData.data]);
      }
      setPage(pageNum);
      setTotalPages(topicsData.meta.totalPages);
    } catch (err) {
      console.error('Erro ao carregar tópicos:', err);
      setError('Não foi possível carregar os tópicos.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(1);
    }, [categoryId])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(1, false);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    loadData(page + 1, false);
  };

  const handleTopicPress = (topic: ForumTopic) => {
    router.push(`/forum/topic/${topic.id}` as any);
  };

  const handleNewTopic = () => {
    router.push(`/forum/category/${categoryId}/new` as any);
  };

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carregando...</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Erro</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={Colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={() => loadData(1)}>
            Tentar novamente
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {category?.name ?? 'Categoria'}
          </Text>
          {category?.description ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {category.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Lista de tópicos */}
      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TopicCard topic={item} onPress={handleTopicPress} />
        )}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="document-text-outline"
              size={32}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>
              Nenhum tópico nesta categoria ainda.
            </Text>
            <Text style={styles.emptySubtext}>
              Seja o primeiro a criar um tópico!
            </Text>
          </View>
        }
      />

      {/* FAB - Novo tópico */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewTopic}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 34,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
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
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
