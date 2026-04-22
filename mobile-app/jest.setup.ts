/**
 * Jest setup — mocks globais rodados antes de cada test file.
 *
 * Estrategia: mockar tudo que precisa de runtime nativo (reanimated,
 * expo-video, firebase, NetInfo) com stubs minimos. Consumers que
 * precisarem de comportamento mais rico sobreescrevem via `jest.mock()`
 * dentro do proprio test.
 *
 * Ordem de mocks importa: reanimated precisa rodar ANTES de qualquer
 * import que toque nele (RN core faz isso internamente em algumas
 * versoes). Por isso esta em `setupFiles` (pre-env) e nao em
 * `setupFilesAfterEach` (post-env).
 */

// ---------------------------------------------------------------------------
// react-native-reanimated
// ---------------------------------------------------------------------------
// A propria lib exporta um mock oficial para Jest. Usar `jest.setup` da
// reanimated v3+ era obsoleto; v4 recomenda esse path:
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// ---------------------------------------------------------------------------
// react-native-worklets (v0.5.x, paired com reanimated 4)
// ---------------------------------------------------------------------------
jest.mock('react-native-worklets', () => ({
  // Worklets no Jest rodam como funcoes normais. runOnJS/runOnUI viram
  // passthroughs — o callback roda sincrono no mesmo thread do test.
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  runOnUI: (fn: (...args: unknown[]) => unknown) => fn,
  createWorkletRuntime: () => ({}),
}));

// ---------------------------------------------------------------------------
// expo-video
// ---------------------------------------------------------------------------
// Lib nativa. Stub retorna player fake com listeners no-op + VideoView
// como View normal. Tests que precisarem de comportamento (ex: disparar
// 'sourceLoad') sobreescrevem esse mock.
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makePlayer = () => ({
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    currentTime: 0,
    duration: 0,
    playing: false,
    playbackRate: 1,
    subtitleTrack: null,
    loop: false,
  });
  return {
    useVideoPlayer: jest.fn(() => makePlayer()),
    VideoView: React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(View, { ...props, ref, testID: 'mocked-video-view' }),
    ),
  };
});

// ---------------------------------------------------------------------------
// @expo/vector-icons
// ---------------------------------------------------------------------------
// O pacote importa expo-font que importa expo-asset — cadeia pesada que nao
// precisa rodar em Jest. Stub cada family como View com testID (permite
// queries em tests que precisem, ex: getByTestId('icon-Ionicons-flame')).
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makeIcon = (family: string) =>
    React.forwardRef((props: { name?: string; testID?: string }, ref: unknown) =>
      React.createElement(View, {
        ...props,
        ref,
        testID: props.testID ?? `icon-${family}-${props.name ?? 'unknown'}`,
      }),
    );
  return {
    Ionicons: makeIcon('Ionicons'),
    MaterialIcons: makeIcon('MaterialIcons'),
    FontAwesome: makeIcon('FontAwesome'),
    FontAwesome5: makeIcon('FontAwesome5'),
    AntDesign: makeIcon('AntDesign'),
    Feather: makeIcon('Feather'),
    Entypo: makeIcon('Entypo'),
    MaterialCommunityIcons: makeIcon('MaterialCommunityIcons'),
  };
});

// ---------------------------------------------------------------------------
// expo-blur
// ---------------------------------------------------------------------------
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(View, { ...props, ref }),
    ),
  };
});

// ---------------------------------------------------------------------------
// expo-screen-orientation
// ---------------------------------------------------------------------------
jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  unlockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: {
    PORTRAIT_UP: 'PORTRAIT_UP',
    LANDSCAPE: 'LANDSCAPE',
  },
}));

// ---------------------------------------------------------------------------
// expo-router
// ---------------------------------------------------------------------------
// Stub leve. Testes que exercitam navigation podem sobrescrever useRouter.
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn(),
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, null, children),
      { Screen: () => null },
    ),
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

// ---------------------------------------------------------------------------
// @react-native-community/netinfo
// ---------------------------------------------------------------------------
// Comportamento default: online. Tests de useNetworkStatus sobreescrevem.
jest.mock('@react-native-community/netinfo', () => {
  const listeners: Array<(state: unknown) => void> = [];
  return {
    __esModule: true,
    default: {
      addEventListener: jest.fn((cb: (state: unknown) => void) => {
        listeners.push(cb);
        return () => {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      }),
      fetch: jest.fn(() =>
        Promise.resolve({ isConnected: true, isInternetReachable: true }),
      ),
      // Helper pra tests — dispara evento sintetico em todos os listeners.
      __emit: (state: unknown) => {
        listeners.forEach((cb) => cb(state));
      },
    },
  };
});

// ---------------------------------------------------------------------------
// firebase/auth
// ---------------------------------------------------------------------------
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
  })),
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({
      user: { uid: 'test-uid', getIdToken: () => Promise.resolve('fake-token') },
    }),
  ),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

// ---------------------------------------------------------------------------
// @react-native-async-storage/async-storage
// ---------------------------------------------------------------------------
// Mock oficial da propria lib.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ---------------------------------------------------------------------------
// react-native-toast-message
// ---------------------------------------------------------------------------
jest.mock('react-native-toast-message', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      show: jest.fn(),
      hide: jest.fn(),
    },
    show: jest.fn(),
    hide: jest.fn(),
    Toast: () => React.createElement('Toast', null),
  };
});

// ---------------------------------------------------------------------------
// nativewind + react-native-css
// ---------------------------------------------------------------------------
// NativeWind preview processa JSX em tempo de build. No Jest isso fica no
// caminho — stub exporta `cssInterop` e `styled` como passthroughs.
jest.mock('nativewind', () => ({
  cssInterop: (Component: unknown) => Component,
  styled: (Component: unknown) => Component,
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn() }),
  verifyInstallation: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Silenciar warnings de act() que vazam de useEffects pos-await.
// ---------------------------------------------------------------------------
const originalError = console.error;
// eslint-disable-next-line no-console
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('not wrapped in act(')) return;
  originalError(...(args as []));
};
