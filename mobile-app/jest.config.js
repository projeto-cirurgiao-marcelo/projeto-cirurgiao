/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // Transforms: jest-expo preset ja cobre TS/TSX/JS/JSX via babel-jest.
  // Adicionamos a whitelist de node_modules que precisam ser transformados
  // (pacotes RN/Expo publicam ESM; Jest por padrao nao transforma node_modules).
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'jest-)?@?react-native' +
      '|@react-native-community' +
      '|@react-navigation' +
      '|expo(nent)?' +
      '|@expo(nent)?/.*' +
      '|expo-.*' +
      '|@expo-google-fonts/.*' +
      '|react-native-.*' +
      '|@unimodules/.*' +
      '|unimodules' +
      '|sentry-expo' +
      '|native-base' +
      '|@sentry/.*' +
      '|firebase' +
      '|@firebase/.*' +
      '|nativewind' +
      '|react-native-css' +
    ')/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/__tests__/**/*.test.(ts|tsx)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.expo/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'text-summary', 'html'],
  // Modulos que provocam parse errors sem mock: redirecionar pros stubs em __mocks__/.
  moduleNameMapper: {
    // CSS/NativeWind: nao precisamos em tests.
    '\\.(css)$': '<rootDir>/__mocks__/styleMock.js',
  },
};
