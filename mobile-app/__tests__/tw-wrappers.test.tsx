import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { Image as ExpoImage } from 'expo-image';
import { TouchableHighlight as RNHighlight, View, type ViewStyle } from 'react-native';
import { useCssElement } from 'react-native-css';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { Image, type ImageProps } from '../src/tw/image';
import { AnimatedScrollView, TouchableHighlight } from '../src/tw';

// Isolate wrapper forwarding from CSS resolution and native image rendering.
jest.mock('react-native-css', () => ({
  useCssElement: jest.fn(<P extends object>(
    component: React.ComponentType<P>,
    props: P,
    _mapping: Record<string, string>,
  ) => {
    const React = require('react') as typeof import('react');
    return React.createElement(component, props);
  }),
  useNativeVariable: jest.fn(),
}));

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));

beforeEach(() => jest.clearAllMocks());

it('preserves animated scroll props, refs and all style mappings', () => {
  const ref = React.createRef<Animated.ScrollView>();
  const offset = renderHook(() => useSharedValue(10)).result.current;
  const props = {
    ref,
    scrollViewOffset: offset,
    style: [false, { opacity: offset, transform: [{ translateY: offset }] }],
    contentContainerStyle: { paddingTop: offset },
    animatedProps: { contentOffset: { x: 0, y: 10 } },
    onScroll: jest.fn(),
    className: 'flex-1',
    contentClassName: 'p-2',
    contentContainerClassName: 'gap-2',
  } satisfies React.ComponentProps<typeof AnimatedScrollView>;

  AnimatedScrollView(props);

  expect(useCssElement).toHaveBeenCalledWith(Animated.ScrollView, props, {
    className: 'style',
    contentClassName: 'contentContainerStyle',
    contentContainerClassName: 'contentContainerStyle',
  });
  expect(jest.mocked(useCssElement).mock.calls[0][1]).toBe(props);
});

it('preserves animated image values and remaps image styles and string sources', () => {
  const opacity = renderHook(() => useSharedValue(0.5)).result.current;
  const style = { opacity, objectFit: 'contain', objectPosition: 'center' } as const;
  const props = {
    source: 'https://example.test/image.png',
    style: [false, style],
    animatedProps: { style: { opacity } },
    onLoad: jest.fn(),
    className: 'rounded-lg',
  } satisfies ImageProps;

  render(<Image {...props} />);

  expect(useCssElement).toHaveBeenCalledWith(expect.any(Function), props, {
    className: 'style',
  });
  expect(ExpoImage).toHaveBeenLastCalledWith(expect.objectContaining({
    source: { uri: props.source },
    style: { opacity },
    contentFit: 'contain',
    contentPosition: 'center',
    animatedProps: props.animatedProps,
    onLoad: props.onLoad,
  }), undefined);
});

it('extracts underlayColor from flattened styles and preserves explicit prop precedence', () => {
  const ref = React.createRef<React.ComponentRef<typeof RNHighlight>>();
  const style: ViewStyle & Pick<React.ComponentProps<typeof RNHighlight>, 'underlayColor'> = {
    opacity: 0.5,
    underlayColor: 'red',
  };
  const { UNSAFE_getByType, rerender } = render(
    <TouchableHighlight ref={ref} style={[false, [style, { padding: 4 }]]}>
      <View />
    </TouchableHighlight>,
  );

  expect(UNSAFE_getByType(RNHighlight).props).toMatchObject({
    underlayColor: 'red',
    style: { opacity: 0.5, padding: 4 },
  });
  expect(UNSAFE_getByType(RNHighlight).props.style).not.toHaveProperty('underlayColor');
  expect(ref.current).not.toBeNull();

  rerender(
    <TouchableHighlight style={style} underlayColor="blue"><View /></TouchableHighlight>,
  );
  expect(UNSAFE_getByType(RNHighlight).props.underlayColor).toBe('blue');

  rerender(<TouchableHighlight><View /></TouchableHighlight>);
  expect(UNSAFE_getByType(RNHighlight).props.style).toEqual({});
});
