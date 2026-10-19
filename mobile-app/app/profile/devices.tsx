import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/colors';
import { devicesService, type ConnectedDevice } from '../../src/services/api/devices.service';
import { logger } from '../../src/lib/logger';

function relative(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 2) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

const ICON: Record<ConnectedDevice['platform'], keyof typeof Ionicons.glyphMap> = {
  ios: 'phone-portrait-outline',
  android: 'phone-portrait-outline',
  web: 'desktop-outline',
};

/** "Dispositivos conectados": lista os aparelhos da conta e permite desconectar os outros. */
export default function DevicesScreen() {
  const [devices, setDevices] = useState<ConnectedDevice[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await devicesService.list());
    } catch (e) {
      logger.error('[Devices] falha ao listar', e);
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const revoke = (d: ConnectedDevice) => {
    Alert.alert('Desconectar aparelho?', `${d.name ?? 'Este aparelho'} vai precisar entrar de novo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          setBusyId(d.id);
          try {
            await devicesService.revoke(d.id);
            setDevices((list) => list?.filter((x) => x.id !== d.id) ?? null);
          } catch (e) {
            logger.error('[Devices] falha ao desconectar', e);
            Alert.alert('Erro', 'Não foi possível desconectar. Tente de novo.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispositivos conectados</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.intro}>
          Sua conta é pessoal e pode ficar conectada em até 3 aparelhos. Ao entrar num quarto, o mais
          antigo é desconectado.
        </Text>

        {devices === null ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
        ) : devices.length === 0 ? (
          <Text style={styles.empty}>Nenhum dispositivo registrado ainda.</Text>
        ) : (
          devices.map((d) => (
            <View key={d.id} style={styles.item}>
              <View style={styles.icon}>
                <Ionicons name={ICON[d.platform]} size={22} color={Colors.accent} />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {d.name ?? (d.platform === 'web' ? 'Navegador' : d.platform === 'ios' ? 'iPhone' : 'Android')}
                  {d.current ? <Text style={styles.current}>  este aparelho</Text> : null}
                </Text>
                <Text style={styles.itemSubtitle}>Último acesso {relative(d.lastSeenAt)}</Text>
              </View>
              {!d.current && (
                <TouchableOpacity
                  onPress={() => revoke(d)}
                  disabled={busyId === d.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Desconectar ${d.name ?? 'aparelho'}`}
                  style={styles.revoke}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {busyId === d.id ? (
                    <ActivityIndicator size="small" color={Colors.danger} />
                  ) : (
                    <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg },
  intro: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
    marginBottom: Spacing.lg,
  },
  empty: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.accent}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.text },
  current: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.regular },
  itemSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  revoke: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
});
