/**
 * Tela de Perfil - Conectada ao AuthStore
 */

import { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../src/stores/auth-store';
import { useGamificationStore } from '../../src/stores/gamification-store';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Estudante',
  ADMIN: 'Administrador',
  INSTRUCTOR: 'Instrutor',
};

const ROLE_ICONS: Record<string, string> = {
  STUDENT: 'school-outline',
  ADMIN: 'shield-checkmark-outline',
  INSTRUCTOR: 'person-outline',
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { profile, fetchProfile, badges, fetchBadges } = useGamificationStore();

  useEffect(() => {
    fetchProfile();
    fetchBadges();
  }, []);

  const initials = useMemo(() => {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.name]);

  const roleLabel = ROLE_LABELS[user?.role || 'STUDENT'] || 'Estudante';
  const roleIcon = ROLE_ICONS[user?.role || 'STUDENT'] || 'school-outline';

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'trophy-outline' as const, title: 'Gamificacao', subtitle: 'Conquistas, ranking e desafios', route: '/profile/gamification' },
    { icon: 'person-outline' as const, title: 'Editar Perfil', subtitle: 'Nome, profissão e especializações', route: '/profile/edit' },
    { icon: 'lock-closed-outline' as const, title: 'Alterar Senha', subtitle: 'Atualizar credenciais', route: '/profile/change-password' },
    { icon: 'notifications-outline' as const, title: 'Notificações', subtitle: 'Configurar alertas', route: '/profile/notifications' },
    { icon: 'help-circle-outline' as const, title: 'Ajuda e Suporte', subtitle: 'Suporte, FAQ e dicas', route: '/profile/help' },
    { icon: 'chatbubble-ellipses-outline' as const, title: 'Perguntas Frequentes', subtitle: '12 perguntas respondidas', route: '/profile/faq' },
  ];

  const legalItems = [
    { icon: 'shield-checkmark-outline' as const, title: 'Política de Privacidade', url: 'https://projetocirurgiao.app/privacy' },
    { icon: 'document-text-outline' as const, title: 'Termos de Uso', url: 'https://projetocirurgiao.app/terms' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header do perfil */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={roleIcon as any} size={14} color={Colors.accent} style={{ marginRight: 4 }} />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        {/* Gamificação */}
        {profile && (
          <View style={styles.gamificationSection}>
            {/* Nível + XP */}
            <View style={styles.levelCard}>
              <View style={[styles.levelBadge, { borderColor: profile.level.color }]}>
                <Text style={[styles.levelNumber, { color: profile.level.color }]}>
                  {profile.level.current}
                </Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>{profile.level.title}</Text>
                <View style={styles.xpBarBg}>
                  <View
                    style={[
                      styles.xpBarFill,
                      {
                        width: `${Math.min(profile.level.progressPercent, 100)}%`,
                        backgroundColor: profile.level.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.xpText}>
                  {profile.xp.total} XP
                  {profile.level.current < 10 && ` / ${profile.level.xpForNextLevel} XP`}
                </Text>
              </View>
            </View>

            {/* Stats rápidos */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="flame" size={18} color="#EF4444" />
                <Text style={styles.statValue}>{profile.streak.current}</Text>
                <Text style={styles.statLabel}>Sequência</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="videocam" size={18} color={Colors.accent} />
                <Text style={styles.statValue}>{profile.stats.videosCompleted}</Text>
                <Text style={styles.statLabel}>Aulas</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="school" size={18} color="#22C55E" />
                <Text style={styles.statValue}>{profile.stats.quizzesPassed}</Text>
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="ribbon" size={18} color="#8B5CF6" />
                <Text style={styles.statValue}>
                  {badges.filter((b) => b.unlockedAt).length}
                </Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu de opções */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as any);
                } else {
                  Alert.alert('Em breve', 'Funcionalidade em desenvolvimento');
                }
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.accent} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Legal</Text>
          {legalItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(item.url)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Botão de logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc3545" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 40,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  userName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.accent}15`,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  // Gamification
  gamificationSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  levelNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  xpBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: 6,
    borderRadius: 3,
  },
  xpText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  menuSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc354510',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#dc354530',
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: '#dc3545',
  },
  bottomSpace: {
    height: Spacing['3xl'],
  },
});
