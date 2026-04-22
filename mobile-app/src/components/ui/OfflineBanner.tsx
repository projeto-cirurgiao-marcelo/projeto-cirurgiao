import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Banner de offline global (fica no root layout). Consome useNetworkStatus
 * pra compartilhar a mesma fonte de verdade com as telas que refazem fetch
 * ao reconectar. Animacao de slide preservada.
 */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const isOffline = !isOnline;
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
        <Text style={styles.text}>Sem conexão com a internet</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  text: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
