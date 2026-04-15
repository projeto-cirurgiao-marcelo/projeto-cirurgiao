import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import type { ChatType } from '../../types/chat.types';

const SPRING_CONFIG = { damping: 15, stiffness: 120 };
const OPTION_BTN = 48;
const OPTION_SPACING = 16;
const FAB_SIZE = 56;
const FAB_RIGHT = 16;
const STAGGER_DELAY = 60;
const MAX_OPTIONS = 3;

// Align option icon buttons with main FAB center
const OPTION_RIGHT = FAB_RIGHT + (FAB_SIZE - OPTION_BTN) / 2;

interface FABOption {
  type: ChatType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ExpandableFABProps {
  showVideoOption: boolean;
  bottomOffset: number;
  onSelectOption: (type: ChatType) => void;
}

export function ExpandableFAB({
  showVideoOption,
  bottomOffset,
  onSelectOption,
}: ExpandableFABProps) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = useSharedValue(0);

  const opt0 = useSharedValue(0);
  const opt1 = useSharedValue(0);
  const opt2 = useSharedValue(0);
  const optValues = useMemo(() => [opt0, opt1, opt2], []);

  const options: FABOption[] = useMemo(() => {
    const list: FABOption[] = [];
    list.push({ type: 'general', label: 'Duvidas Gerais', icon: 'chatbubbles-outline' });
    if (showVideoOption) {
      list.push({ type: 'video', label: 'Duvidas sobre esta aula', icon: 'sparkles' });
    }
    list.push({ type: 'library', label: 'Biblioteca IA', icon: 'sparkles' });
    return list;
  }, [showVideoOption]);

  const animateAll = useCallback((target: number) => {
    for (let i = 0; i < MAX_OPTIONS; i++) {
      optValues[i].value = withDelay(i * STAGGER_DELAY, withSpring(target, SPRING_CONFIG));
    }
  }, [optValues]);

  const toggle = useCallback(() => {
    const opening = isOpen.value <= 0.5;
    setExpanded(opening);
    isOpen.value = withSpring(opening ? 1 : 0, SPRING_CONFIG);
    animateAll(opening ? 1 : 0);
  }, [animateAll]);

  const close = useCallback(() => {
    setExpanded(false);
    isOpen.value = withSpring(0, SPRING_CONFIG);
    animateAll(0);
  }, [animateAll]);

  const handleSelect = useCallback((type: ChatType) => {
    close();
    setTimeout(() => onSelectOption(type), 100);
  }, [onSelectOption, close]);

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(isOpen.value, [0, 1], [0, 45])}deg` }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isOpen.value, [0, 1], [0, 0.3]),
  }));

  // Each option floats up from the FAB position
  const fabBottom = bottomOffset;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Options — each one is independently positioned */}
      {options.map((option, index) => {
        const slot = index;
        const baseUp = FAB_SIZE + OPTION_SPACING;
        const targetBottom = fabBottom + baseUp + slot * (OPTION_BTN + OPTION_SPACING);

        return (
          <OptionRow
            key={option.type}
            option={option}
            progress={optValues[index]}
            closedBottom={fabBottom}
            openBottom={targetBottom}
            onPress={() => handleSelect(option.type)}
          />
        );
      })}

      {/* Main FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom, right: FAB_RIGHT }]}
        onPress={toggle}
        activeOpacity={0.85}
      >
        <Animated.View style={fabIconStyle}>
          <Ionicons name="add" size={26} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </>
  );
}

// ———— Option Row ————

function OptionRow({
  option,
  progress,
  closedBottom,
  openBottom,
  onPress,
}: {
  option: FABOption;
  progress: SharedValue<number>;
  closedBottom: number;
  openBottom: number;
  onPress: () => void;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    bottom: interpolate(progress.value, [0, 1], [closedBottom, openBottom]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.5, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.optionRow, animStyle]} pointerEvents="box-none">
      <View style={styles.labelPill}>
        <Text style={styles.labelText} numberOfLines={1}>
          {option.label}
        </Text>
      </View>
      <TouchableOpacity style={styles.optionBtn} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name={option.icon} size={20} color={colors.accent} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ———— Styles ————

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 90,
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#496CFB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    elevation: 8,
    shadowColor: '#9C3F00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  optionRow: {
    position: 'absolute',
    right: OPTION_RIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 100,
  },
  labelPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2F2F',
  },
  optionBtn: {
    width: OPTION_BTN,
    height: OPTION_BTN,
    borderRadius: OPTION_BTN / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});
