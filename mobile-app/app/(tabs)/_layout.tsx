/**
 * Layout das Tabs - Navegacao principal
 * 4 abas: Inicio, Forum, Mentor IA, Perfil
 * Floating Liquid Glass tab bar com indicador deslizante animado
 *
 * O CustomTabBar usa SafeAreaView edges={['bottom']} como wrapper.
 * Isso garante que o React Navigation meca a altura real (incluindo
 * safe area) e dimensione a cena corretamente acima do tab bar.
 */

import { useEffect, useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../src/constants/colors';
import { TabBarHeightProvider } from '../../src/contexts/tab-bar-height';

const isIOS = process.env.EXPO_OS === 'ios';
const ICON_SIZE = 22;
const PILL_SIZE = 48;
const BAR_HEIGHT = 56;
const SAFETY_GAP = 8;
const MIN_BOTTOM = 16;

const TAB_CONFIG: Record<string, {
  label: string;
  sfIcon: string;
  sfIconFocused: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}> = {
  index: {
    label: 'Inicio',
    sfIcon: 'house',
    sfIconFocused: 'house.fill',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  forum: {
    label: 'Forum',
    sfIcon: 'book',
    sfIconFocused: 'book.fill',
    icon: 'book-outline',
    iconFocused: 'book',
  },
  'mentor-ia': {
    label: 'Mentor',
    sfIcon: 'sparkles',
    sfIconFocused: 'sparkles',
    icon: 'sparkles-outline',
    iconFocused: 'sparkles',
  },
  profile: {
    label: 'Perfil',
    sfIcon: 'person',
    sfIconFocused: 'person.fill',
    icon: 'person-outline',
    iconFocused: 'person',
  },
};

function TabIcon({ name, isFocused }: { name: string; isFocused: boolean }) {
  const config = TAB_CONFIG[name];
  if (!config) return null;
  const color = isFocused ? Colors.accent : '#4A4A4F';

  if (isIOS) {
    return (
      <Image
        source={`sf:${isFocused ? config.sfIconFocused : config.sfIcon}`}
        tintColor={color}
        style={{ width: ICON_SIZE, height: ICON_SIZE }}
      />
    );
  }

  return (
    <Ionicons
      name={isFocused ? config.iconFocused : config.icon}
      size={ICON_SIZE}
      color={color}
    />
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(0);
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const useGlass = isLiquidGlassAvailable();

  // Espaco extra abaixo do bar para dispositivos sem safe area (ex: Android)
  const extraBottom = Math.max(MIN_BOTTOM - insets.bottom, 0);

  const handleTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => ({ ...prev, [index]: { x, width } }));
  }, []);

  useEffect(() => {
    const layout = tabLayouts[state.index];
    if (!layout) return;
    indicatorX.value = withSpring(layout.x + (layout.width - PILL_SIZE) / 2, {
      damping: 15,
      stiffness: 120,
    });
  }, [state.index, tabLayouts]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const barContent = (
    <>
      {/* Sliding pill indicator */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: (BAR_HEIGHT - PILL_SIZE) / 2,
            width: PILL_SIZE,
            height: PILL_SIZE,
            borderRadius: PILL_SIZE / 2,
            backgroundColor: `${Colors.accent}14`,
            ...(isIOS && { borderCurve: 'continuous' as const }),
          },
          pillStyle,
        ]}
      />

      {/* Tab buttons */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', zIndex: 1 }}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              onLayout={(e) => handleTabLayout(index, e)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2,
              }}
              activeOpacity={0.7}
            >
              <TabIcon name={route.name} isFocused={isFocused} />
              <Text
                style={{
                  fontSize: 9,
                  lineHeight: 12,
                  textAlign: 'center',
                  color: isFocused ? Colors.accent : '#4A4A4F',
                  fontWeight: isFocused ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const floatingBar = {
    position: 'absolute' as const,
    top: SAFETY_GAP,
    left: 48,
    right: 48,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden' as const,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
    ...(isIOS && { borderCurve: 'continuous' as const }),
  };

  // SafeAreaView edges={['bottom']} adiciona paddingBottom nativo = insets.bottom.
  // Dentro dele, o View tem altura fixa = gap + bar + margem extra.
  // Resultado: React Navigation mede altura total = insets.bottom + gap + bar + extra.
  // A cena e dimensionada automaticamente acima deste espaco.
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
      <View style={{ height: SAFETY_GAP + BAR_HEIGHT + extraBottom }}>
        {useGlass ? (
          <GlassView style={floatingBar}>
            {barContent}
          </GlassView>
        ) : (
          <View
            style={{
              ...floatingBar,
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.45)',
            }}
          >
            <BlurView
              intensity={65}
              tint="systemChromeMaterial"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {barContent}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarTotalHeight = BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM) + SAFETY_GAP;

  return (
    <TabBarHeightProvider value={tabBarTotalHeight}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="forum" />
        <Tabs.Screen name="mentor-ia" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </TabBarHeightProvider>
  );
}
