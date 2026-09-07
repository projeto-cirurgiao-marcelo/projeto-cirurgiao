/**
 * A rota e a query `showcase` continuam disponíveis para Android/web.
 * No iOS, todos os usuários recebem apenas suporte nativo, inclusive por
 * deep link. Checkout via ajuda web também é um caminho de compra externa;
 * sua inclusão no iOS exige conformidade e review, não um toggle remoto.
 */
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { helpUrl, isExternalCheckoutUrl } from '../src/constants/urls';
import { Colors as colors } from '../src/constants/colors';
import { logger } from '../src/lib/logger';
import NativeHelpScreen from './profile/help';

export default function HelpScreen() {
  return Platform.OS === 'ios' ? <NativeHelpScreen /> : <WebHelpScreen />;
}

function WebHelpScreen() {
  const router = useRouter();
  const { showcase } = useLocalSearchParams<{ showcase?: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const url = helpUrl(showcase);

  const handleShouldStart = (req: WebViewNavigation): boolean => {
    if (isExternalCheckoutUrl(req.url)) {
      Linking.openURL(req.url).catch((err) =>
        logger.error('[Help] Erro ao abrir link externo:', err),
      );
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
        <View style={{ width: 40 }} />
      </View>

      {failed ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Não foi possível carregar a ajuda</Text>
          <Text style={styles.emptyText}>Verifique sua conexão e tente novamente.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setFailed(false);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
          onShouldStartLoadWithRequest={handleShouldStart}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
        />
      )}
      {loading && !failed && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  webview: { flex: 1, backgroundColor: colors.background },
  loadingOverlay: {
    position: 'absolute', top: 72, left: 0, right: 0, alignItems: 'center',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryButton: {
    marginTop: 8, backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
