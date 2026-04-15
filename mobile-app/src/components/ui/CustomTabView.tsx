import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';

interface Route {
  key: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface CustomTabViewProps {
  routes: Route[];
  renderScene: (route: Route) => React.ReactNode;
  initialIndex?: number;
}

export function CustomTabView({ routes, renderScene, initialIndex = 0 }: CustomTabViewProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const activeRoute = routes[activeIndex];

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {routes.map((route, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveIndex(index)}
              activeOpacity={0.7}
            >
              {route.icon ? (
                <Ionicons
                  name={route.icon}
                  size={18}
                  color={isActive ? colors.accent : colors.textMuted}
                />
              ) : (
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {route.title}
                </Text>
              )}
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderScene(activeRoute)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.accent,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
  },
});
