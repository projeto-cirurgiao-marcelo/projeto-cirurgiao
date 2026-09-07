import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import secureStorage from '../../src/lib/secure-storage';
import { apiClient, resetApiSession } from '../../src/services/api/client';
import { useAuthStore } from '../../src/stores/auth-store';
import { User } from '../../src/types';

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('../../src/services/firebase', () => ({
  auth: { currentUser: null, authStateReady: jest.fn() },
}));
jest.mock('../../src/lib/secure-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('../../src/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const backendUser: User = {
  id: 'invited-user', email: 'invited@example.com', name: 'Invited User', role: 'STUDENT',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const firebaseUser = {
  uid: 'firebase-uid', email: backendUser.email, displayName: backendUser.name,
  photoURL: null, emailVerified: true, getIdToken: jest.fn(),
};
const mockAuth = auth as unknown as {
  currentUser: typeof firebaseUser | null;
  authStateReady: jest.Mock;
};
const storage = jest.mocked(secureStorage);
const values = new Map<string, string>();
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const mockSignOut = signOut as jest.Mock;
const mockSignIn = signInWithEmailAndPassword as jest.Mock;

function response(config: InternalAxiosRequestConfig, status = 200): AxiosResponse {
  return { config, status, statusText: String(status), headers: {}, data: { user: backendUser } };
}

function httpError(config: InternalAxiosRequestConfig, status: number) {
  return new AxiosError('HTTP error', undefined, config, undefined, response(config, status));
}

async function restorePersistedSession() {
  await AsyncStorage.setItem('auth-storage', JSON.stringify({
    state: { user: backendUser, isAuthenticated: true }, version: 0,
  }));
  await useAuthStore.persist.rehydrate();
  values.set('firebaseToken', 'persisted-stale');
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
}

async function expectLoggedOut() {
  expect(useAuthStore.getState()).toMatchObject({
    user: null, firebaseUser: null, firebaseToken: null,
    isAuthenticated: false, isLoading: false, hasHydrated: true,
  });
  expect(values.has('firebaseToken')).toBe(false);
  const persisted = JSON.parse((await AsyncStorage.getItem('auth-storage'))!);
  expect(persisted.state).toEqual({ user: null, isAuthenticated: false });
}

beforeEach(async () => {
  await resetApiSession();
  jest.clearAllMocks();
  values.clear();
  await AsyncStorage.clear();
  // Finish initial Zustand hydration before establishing each test's state.
  await useAuthStore.persist.rehydrate();
  useAuthStore.setState({
    user: null, firebaseUser: null, firebaseToken: null,
    isAuthenticated: false, isLoading: false, error: null, hasHydrated: true,
  });
  mockAuth.currentUser = firebaseUser;
  mockAuth.authStateReady.mockResolvedValue(undefined);
  firebaseUser.getIdToken.mockResolvedValue('firebase-current');
  storage.getItem.mockImplementation(async (key) => values.get(key) ?? null);
  storage.setItem.mockImplementation(async (key, value) => { values.set(key, value); });
  storage.removeItem.mockImplementation(async (key) => { values.delete(key); });
  mockSignOut.mockImplementation(async () => { mockAuth.currentUser = null; });
  mockSignIn.mockImplementation(async () => {
    mockAuth.currentUser = firebaseUser;
    return { user: firebaseUser };
  });
  adapter.mockImplementation(async (config) => response(config));
  apiClient.defaults.adapter = adapter;
});

afterEach(async () => {
  await useAuthStore.getState().logout();
});

it('does not expose a public registration action', () => {
  expect(useAuthStore.getState()).not.toHaveProperty('register');
});

it('clears a persisted session when Firebase has no current user', async () => {
  await restorePersistedSession();
  mockAuth.currentUser = null;
  await useAuthStore.getState().loadUser();
  await expectLoggedOut();
  expect(adapter).not.toHaveBeenCalled();
  expect(mockSignOut).toHaveBeenCalledWith(auth);
  expect(storage.removeItem).toHaveBeenCalledWith('firebaseToken');
});

it('waits for authStateReady instead of treating a restoring user as logged out', async () => {
  await restorePersistedSession();
  const ready = deferred<void>();
  mockAuth.currentUser = null;
  mockAuth.authStateReady.mockReturnValue(ready.promise);
  const loading = useAuthStore.getState().loadUser();
  expect(mockAuth.authStateReady).toHaveBeenCalledTimes(1);
  expect(adapter).not.toHaveBeenCalled();
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(useAuthStore.getState().isAuthenticated).toBe(true);

  mockAuth.currentUser = firebaseUser;
  ready.resolve(undefined);
  await loading;
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({
    user: backendUser, firebaseToken: 'firebase-current', isAuthenticated: true,
    isLoading: false, hasHydrated: true,
  });
  expect(mockSignOut).not.toHaveBeenCalled();
});

it('bootstraps with a renewed Firebase token in body, header, store and secure storage', async () => {
  await restorePersistedSession();
  let token = 'initial-token';
  firebaseUser.getIdToken.mockImplementation(async (force?: boolean) => {
    if (force) token = 'renewed-token';
    return token;
  });
  const bodies: unknown[] = [];
  const headers: unknown[] = [];
  adapter.mockImplementation(async (config) => {
    bodies.push(JSON.parse(config.data));
    headers.push(config.headers.get('Authorization'));
    if (bodies.length === 1) throw httpError(config, 401);
    return response(config);
  });

  await useAuthStore.getState().loadUser();
  expect(bodies).toEqual([{ firebaseToken: 'initial-token' }, { firebaseToken: 'renewed-token' }]);
  expect(headers).toEqual(['Bearer initial-token', 'Bearer renewed-token']);
  expect(firebaseUser.getIdToken.mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  expect(useAuthStore.getState()).toMatchObject({
    user: backendUser, firebaseUser: { uid: firebaseUser.uid }, firebaseToken: 'renewed-token',
    isAuthenticated: true, isLoading: false, hasHydrated: true,
  });
  expect(values.get('firebaseToken')).toBe('renewed-token');
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(JSON.parse((await AsyncStorage.getItem('auth-storage'))!).state)
    .toEqual({ user: backendUser, isAuthenticated: true });
});

it.each(['network', 'server', 'refresh-network'])(
  'preserves an existing session on %s failure during bootstrap', async (failure) => {
    await restorePersistedSession();
    const offline = Object.assign(new Error('Offline'), { code: 'auth/network-request-failed' });
    firebaseUser.getIdToken.mockImplementation(async (force?: boolean) => {
      if (force) throw offline;
      return 'firebase-current';
    });
    adapter.mockImplementation(async (config) => {
      if (failure === 'network') throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
      throw httpError(config, failure === 'server' ? 503 : 401);
    });

    await useAuthStore.getState().loadUser();
    expect(useAuthStore.getState()).toMatchObject({
      user: backendUser, isAuthenticated: true, isLoading: false, hasHydrated: true,
      firebaseToken: 'firebase-current', error: expect.any(String),
    });
    expect(values.get('firebaseToken')).toBe('firebase-current');
    expect(mockAuth.currentUser).toBe(firebaseUser);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(JSON.parse((await AsyncStorage.getItem('auth-storage'))!).state)
      .toEqual({ user: backendUser, isAuthenticated: true });
  },
);

it('does not authenticate a new session when bootstrap is offline', async () => {
  adapter.mockImplementation(async (config) => {
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  });
  await useAuthStore.getState().loadUser();
  expect(useAuthStore.getState()).toMatchObject({
    user: null, isAuthenticated: false, isLoading: false, hasHydrated: true,
  });
  expect(mockSignOut).not.toHaveBeenCalled();
});

it.each([401, 403])('clears the integrated session after definitive HTTP %s rejection', async (status) => {
  await restorePersistedSession();
  adapter.mockImplementation(async (config) => { throw httpError(config, status); });
  await useAuthStore.getState().loadUser();
  await expectLoggedOut();
  expect(mockAuth.currentUser).toBeNull();
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(adapter).toHaveBeenCalledTimes(status === 401 ? 2 : 1);
});

it('clears state immediately and joins concurrent logouts while Firebase signOut is pending', async () => {
  await restorePersistedSession();
  useAuthStore.setState({ firebaseToken: 'old-token', firebaseUser, isLoading: true, error: 'old-error' });
  const signedOut = deferred<void>();
  mockSignOut.mockImplementation(async () => {
    await signedOut.promise;
    mockAuth.currentUser = null;
  });
  const first = useAuthStore.getState().logout();
  const second = useAuthStore.getState().logout();
  expect(first).toBe(second);
  expect(useAuthStore.getState()).toMatchObject({
    user: null, firebaseUser: null, firebaseToken: null, isAuthenticated: false,
    isLoading: false, error: null, hasHydrated: true,
  });
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  signedOut.resolve(undefined);
  await Promise.all([first, second]);
  await expectLoggedOut();
  expect(mockAuth.currentUser).toBeNull();
  expect(storage.removeItem).toHaveBeenCalledTimes(1);
  expect(mockSignOut).toHaveBeenCalledWith(auth);
});

it('still clears local state and storage if Firebase signOut fails', async () => {
  await restorePersistedSession();
  mockSignOut.mockRejectedValue(new Error('Firebase unavailable'));
  await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();
  await expectLoggedOut();
});

it('does not restore the store from a bootstrap response received after logout', async () => {
  await restorePersistedSession();
  const pending = deferred<AxiosResponse>();
  const dispatched = deferred<InternalAxiosRequestConfig>();
  adapter.mockImplementation((config) => { dispatched.resolve(config); return pending.promise; });
  const loading = useAuthStore.getState().loadUser();
  const config = await dispatched.promise;
  await useAuthStore.getState().logout();
  pending.resolve(response(config));
  await loading;
  await expectLoggedOut();
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('does not restore or resend bootstrap when logout happens during refresh', async () => {
  await restorePersistedSession();
  const refresh = deferred<string>();
  const refreshing = deferred<void>();
  firebaseUser.getIdToken.mockImplementation((force?: boolean) => {
    if (!force) return Promise.resolve('old-token');
    refreshing.resolve(undefined);
    return refresh.promise;
  });
  adapter.mockImplementation(async (config) => { throw httpError(config, 401); });
  const loading = useAuthStore.getState().loadUser();
  await refreshing.promise;
  await useAuthStore.getState().logout();
  storage.setItem.mockClear();
  refresh.resolve('late-token');
  await loading;
  await expectLoggedOut();
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('keeps the token renewed by the client instead of overwriting it with the pre-login token', async () => {
  let token = 'pre-login-token';
  firebaseUser.getIdToken.mockImplementation(async (force?: boolean) => {
    if (force) token = 'renewed-login-token';
    return token;
  });
  const bodies: unknown[] = [];
  adapter.mockImplementation(async (config) => {
    bodies.push(JSON.parse(config.data));
    if (bodies.length === 1) throw httpError(config, 401);
    return response(config);
  });

  await useAuthStore.getState().login({ email: backendUser.email, password: 'test-password' });
  expect(mockSignIn).toHaveBeenCalledWith(auth, backendUser.email, 'test-password');
  expect(bodies).toEqual([{ firebaseToken: 'pre-login-token' }, { firebaseToken: 'renewed-login-token' }]);
  expect(values.get('firebaseToken')).toBe('renewed-login-token');
  expect(useAuthStore.getState()).toMatchObject({
    user: backendUser, firebaseToken: 'renewed-login-token', isAuthenticated: true, isLoading: false,
  });
});

it.each([200, 401])('does not log out a newer login when the old login returns HTTP %s', async (status) => {
  const pending = deferred<AxiosResponse>();
  const dispatched = deferred<InternalAxiosRequestConfig>();
  adapter.mockImplementationOnce((config) => { dispatched.resolve(config); return pending.promise; });
  const oldLogin = useAuthStore.getState().login({ email: backendUser.email, password: 'old-password' })
    .catch((error: unknown) => error);
  const oldConfig = await dispatched.promise;
  await useAuthStore.getState().logout();

  const nextUser = { ...backendUser, id: 'next-user', email: 'next@example.com' };
  const nextFirebaseUser = {
    ...firebaseUser, uid: 'next-firebase-uid', email: nextUser.email,
    getIdToken: jest.fn().mockResolvedValue('next-token'),
  };
  mockSignIn.mockImplementationOnce(async () => {
    mockAuth.currentUser = nextFirebaseUser;
    return { user: nextFirebaseUser };
  });
  adapter.mockImplementation(async (config) => ({ ...response(config), data: { user: nextUser } }));
  await useAuthStore.getState().login({ email: nextUser.email, password: 'next-password' });
  expect(useAuthStore.getState().user).toEqual(nextUser);
  mockSignOut.mockClear();

  if (status === 200) pending.resolve(response(oldConfig));
  else pending.reject(httpError(oldConfig, status));
  await oldLogin;

  expect(useAuthStore.getState()).toMatchObject({
    user: nextUser, firebaseToken: 'next-token', isAuthenticated: true, error: null,
  });
  expect(mockAuth.currentUser).toBe(nextFirebaseUser);
  expect(values.get('firebaseToken')).toBe('next-token');
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(adapter).toHaveBeenCalledTimes(2);
});
