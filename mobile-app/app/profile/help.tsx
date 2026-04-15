import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

const SUPPORT_EMAIL = 'contato@projetocirurgiao.app';

interface HelpItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action: () => void;
}

export default function HelpScreen() {
  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Suporte - App Projeto Cirurgião`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo de email.');
    });
  };

  const openFAQ = () => {
    router.push('/profile/faq' as any);
  };

  const helpItems: HelpItem[] = [
    {
      icon: 'help-circle-outline',
      title: 'Perguntas Frequentes',
      subtitle: 'Respostas para as dúvidas mais comuns',
      action: openFAQ,
    },
    {
      icon: 'mail-outline',
      title: 'Enviar Email',
      subtitle: SUPPORT_EMAIL,
      action: openEmail,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuda e Suporte</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset-outline" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Como podemos ajudar?</Text>
          <Text style={styles.heroSubtitle}>
            Escolha uma das opções abaixo ou entre em contato diretamente com nossa equipe.
          </Text>
        </View>

        {/* Help items */}
        {helpItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.helpItem}
            onPress={item.action}
            activeOpacity={0.7}
          >
            <View style={styles.helpIcon}>
              <Ionicons name={item.icon} size={22} color={Colors.accent} />
            </View>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>{item.title}</Text>
              <Text style={styles.helpSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Dicas rápidas */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Dicas rápidas</Text>

          <View style={styles.tipCard}>
            <Ionicons name="wifi-outline" size={18} color={Colors.warning} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Problemas de conexão?</Text>
              <Text style={styles.tipText}>
                Verifique sua conexão com a internet. O app requer conexão para carregar aulas e salvar progresso.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="refresh-outline" size={18} color={Colors.info} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Vídeo não carrega?</Text>
              <Text style={styles.tipText}>
                Tente puxar a tela para baixo para atualizar, ou feche e reabra o app.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="key-outline" size={18} color={Colors.success} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Não consegue fazer login?</Text>
              <Text style={styles.tipText}>
                Use a opção "Esqueci minha senha" na tela de login para redefinir suas credenciais.
              </Text>
            </View>
          </View>
        </View>

        {/* App version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Projeto Cirurgião v1.0.0</Text>
          <Text style={styles.versionSubtext}>Plataforma de Cirurgia Veterinária</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.accent}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.5,
    paddingHorizontal: Spacing.lg,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.accent}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  helpSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  tipsSection: {
    marginTop: Spacing.xl,
  },
  tipsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  tipText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: FontSize.xs * 1.5,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginTop: Spacing.lg,
  },
  versionText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  versionSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
