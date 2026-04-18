import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { coursesService } from '../../src/services/api/courses.service';
import { progressService } from '../../src/services/api/progress.service';
import { logger } from '../../src/lib/logger';
import { CatalogCourseCard } from '../../src/components/course/CatalogCourseCard';
import { Colors as colors } from '../../src/constants/colors';
import type { Course } from '../../src/types/course.types';
import type { EnrolledCourse } from '../../src/types/student.types';

type AnyCourse = Course | EnrolledCourse;
type FilterType = 'all' | 'in-progress' | 'popular';
type SortType = 'recent' | 'popular' | 'az' | 'progress';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'in-progress', label: 'Em Andamento' },
  { key: 'popular', label: 'Populares' },
];

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'recent', label: 'Mais Recentes' },
  { key: 'popular', label: 'Mais Populares' },
  { key: 'az', label: 'A-Z' },
  { key: 'progress', label: 'Meu Progresso' },
];

function isEnrolled(course: AnyCourse): course is EnrolledCourse {
  return 'enrollment' in course;
}

function getProgress(course: AnyCourse): number {
  if (!isEnrolled(course)) return -1;
  return course.progress?.percentage ?? course.progress?.progressPercentage ?? course.enrollment?.progress ?? 0;
}

export default function CatalogScreen() {
  const router = useRouter();
  const [allCourses, setAllCourses] = useState<AnyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('recent');

  const loadCourses = useCallback(async () => {
    try {
      const [coursesData, enrolledData] = await Promise.all([
        coursesService.findAll({ limit: 100 }),
        progressService.getEnrolledCourses(),
      ]);

      const courses = Array.isArray(coursesData) ? coursesData : coursesData.data;
      const enrolledMap = new Map(enrolledData.map((c) => [c.id, c]));

      // Merge: enrolled courses replace their non-enrolled versions
      const merged: AnyCourse[] = [];
      const addedIds = new Set<string>();

      for (const ec of enrolledData) {
        merged.push(ec);
        addedIds.add(ec.id);
      }
      for (const c of courses) {
        if (!addedIds.has(c.id)) {
          merged.push(c);
        }
      }

      setAllCourses(merged);
    } catch (error) {
      logger.error('[Catalog] Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  // Filter + Search + Sort
  const filteredCourses = useMemo(() => {
    let result = [...allCourses];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // Filter
    if (filter === 'in-progress') {
      result = result.filter((c) => {
        const p = getProgress(c);
        return p > 0 && p < 100;
      });
    } else if (filter === 'popular') {
      result.sort((a, b) => (b._count?.enrollments ?? 0) - (a._count?.enrollments ?? 0));
      return result;
    }

    // Sort
    switch (sort) {
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'popular':
        result.sort((a, b) => (b._count?.enrollments ?? 0) - (a._count?.enrollments ?? 0));
        break;
      case 'az':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'progress':
        result.sort((a, b) => {
          const ea = isEnrolled(a) ? 1 : 0;
          const eb = isEnrolled(b) ? 1 : 0;
          if (ea !== eb) return eb - ea;
          return getProgress(b) - getProgress(a);
        });
        break;
    }

    return result;
  }, [allCourses, search, filter, sort]);

  const handleSort = () => {
    const options = SORT_OPTIONS.map((o) => o.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, 'Cancelar'], cancelButtonIndex: options.length },
        (index) => {
          if (index < options.length) setSort(SORT_OPTIONS[index].key);
        },
      );
    } else {
      Alert.alert('Ordenar por', undefined, [
        ...SORT_OPTIONS.map((o) => ({
          text: `${sort === o.key ? '✓ ' : ''}${o.label}`,
          onPress: () => setSort(o.key),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Todos os Cursos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar cursos..."
            placeholderTextColor="#94A3B8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters + Sort */}
      <View style={styles.filterRow}>
        <View style={styles.filterChips}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={handleSort} activeOpacity={0.7}>
          <Ionicons name="swap-vertical-outline" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Count */}
      <Text style={styles.countText}>{filteredCourses.length} cursos encontrados</Text>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : filteredCourses.length > 0 ? (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
          renderItem={({ item }) => (
            <CatalogCourseCard
              course={item}
              onPress={() => router.push(`/course/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name={search ? 'search-outline' : 'school-outline'} size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>
            {search ? 'Nenhum curso encontrado' : 'Nenhum curso disponivel'}
          </Text>
          <Text style={styles.emptyText}>
            {search ? 'Tente buscar por outro termo' : 'Novos cursos serao adicionados em breve'}
          </Text>
          {(search || filter !== 'all') && (
            <TouchableOpacity onPress={() => { setSearch(''); setFilter('all'); }}>
              <Text style={styles.clearLink}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 16, height: 46, gap: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B' },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8,
  },
  filterChips: { flexDirection: 'row', gap: 8, flex: 1 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  chipActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}0F` },
  chipText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  chipTextActive: { color: colors.accent, fontWeight: '600' },
  sortButton: {
    width: 38, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  countText: {
    fontSize: 12, fontWeight: '500', color: '#94A3B8',
    paddingHorizontal: 16, marginBottom: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  clearLink: { fontSize: 14, fontWeight: '600', color: colors.accent, marginTop: 4 },
});
