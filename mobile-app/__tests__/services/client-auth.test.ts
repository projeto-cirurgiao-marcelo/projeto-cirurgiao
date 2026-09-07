import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { auth } from '../../src/services/firebase';
import secureStorage from '../../src/lib/secure-storage';
import { apiClient, configureApiAuth, resetApiSession } from '../../src/services/api/client';

jest.mock('../../src/services/firebase', () => ({
  auth: { currentUser: null, authStateReady: jest.fn() },
}));
jest.mock('../../src/lib/secure-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function response(config: InternalAxiosRequestConfig, status = 200): AxiosResponse {
  return { config, status, statusText: String(status), headers: {}, data: { url: config.url } };
}

// Custom Axios adapters must reject non-2xx themselves (Axios does not settle them).
function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, response(config, 401));
}

const mockAuth = auth as unknown as {
  currentUser: { getIdToken: jest.Mock } | null;
  authStateReady: jest.Mock;
};
const storage = jest.mocked(secureStorage);
const values = new Map<string, string>();
const getIdToken = jest.fn();
const onTokenChanged = jest.fn();
const onSessionExpired = jest.fn();
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
let currentToken: string;

beforeEach(async () => {
  jest.useRealTimers();
  await resetApiSession();
  jest.resetAllMocks();
  values.clear();
  currentToken = 'firebase-current';
  mockAuth.currentUser = { getIdToken };
  mockAuth.authStateReady.mockResolvedValue(undefined);
  getIdToken.mockImplementation(async () => currentToken);
  storage.getItem.mockImplementation(async (key) => values.get(key) ?? null);
  storage.setItem.mockImplementation(async (key, value) => { values.set(key, value); });
  storage.removeItem.mockImplementation(async (key) => { values.delete(key); });
  onSessionExpired.mockImplementation(async () => {
    mockAuth.currentUser = null;
    await resetApiSession();
  });
  configureApiAuth({ onTokenChanged, onSessionExpired });
  adapter.mockImplementation(async (config) => response(config));
  apiClient.defaults.adapter = adapter;
});

afterEach(async () => {
  await resetApiSession();
});

it('uses Firebase on every request, never the persisted token or a caller header', async () => {
  values.set('firebaseToken', 'persisted-stale');
  await apiClient.get('/first', { headers: { Authorization: 'Bearer caller-stale' } });
  currentToken = 'firebase-new';
  await apiClient.get('/second');

  expect(getIdToken.mock.calls).toEqual([[], []]);
  expect(adapter.mock.calls.map(([config]) => config.headers.get('Authorization')))
    .toEqual(['Bearer firebase-current', 'Bearer firebase-new']);
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(values.get('firebaseToken')).toBe('firebase-new');
  expect(onTokenChanged.mock.calls).toEqual([['firebase-current'], ['firebase-new']]);
});

it('waits for Firebase restoration before choosing the request token', async () => {
  const ready = deferred<void>();
  mockAuth.currentUser = null;
  mockAuth.authStateReady.mockReturnValue(ready.promise);
  const request = apiClient.get('/restored');
  await Promise.resolve();
  expect(mockAuth.authStateReady).toHaveBeenCalledTimes(1);
  expect(adapter).not.toHaveBeenCalled();
  expect(getIdToken).not.toHaveBeenCalled();

  mockAuth.currentUser = { getIdToken };
  ready.resolve(undefined);
  await request;
  expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer firebase-current');
});

it('does not send a persisted or caller token without a Firebase user', async () => {
  mockAuth.currentUser = null;
  values.set('firebaseToken', 'stale');
  await apiClient.get('/public', { headers: { Authorization: 'Bearer stale' } });
  expect(adapter.mock.calls[0][0].headers.has('Authorization')).toBe(false);
  expect(getIdToken).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});

it('shares one forced refresh across concurrent 401s and retries all without logout', async () => {
  const refresh = deferred<string>();
  const refreshing = deferred<void>();
  getIdToken.mockImplementation((force?: boolean) => {
    if (!force) return Promise.resolve(currentToken);
    refreshing.resolve(undefined);
    return refresh.promise.then((token) => { currentToken = token; return token; });
  });
  const attempts = new Map<string, number>();
  const sent: Array<{ url: string; token: unknown }> = [];
  adapter.mockImplementation(async (config) => {
    const url = config.url!;
    sent.push({ url, token: config.headers.get('Authorization') });
    attempts.set(url, (attempts.get(url) ?? 0) + 1);
    if (attempts.get(url) === 1) throw unauthorized(config);
    return response(config);
  });
  const requests = Promise.all(['/a', '/b', '/c'].map((url) => apiClient.get(url)));
  await refreshing.promise;
  // Drain the other 401 handlers while the refresh is explicitly held open.
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(adapter).toHaveBeenCalledTimes(3);
  expect(getIdToken.mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  refresh.resolve('refreshed');

  expect((await requests).map((result) => result.data.url)).toEqual(['/a', '/b', '/c']);
  expect(Array.from(attempts.values())).toEqual([2, 2, 2]);
  expect(sent.slice(3).map(({ token }) => token)).toEqual(Array(3).fill('Bearer refreshed'));
  expect(getIdToken.mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  expect(onSessionExpired).not.toHaveBeenCalled();
  expect(values.get('firebaseToken')).toBe('refreshed');
});

it('expires the session after a retry also returns 401, without a refresh loop', async () => {
  adapter.mockImplementation(async (config) => { throw unauthorized(config); });
  await expect(apiClient.get('/private')).rejects.toMatchObject({ response: { status: 401 } });
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(getIdToken.mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  expect(onSessionExpired).toHaveBeenCalledTimes(1);
  expect(values.has('firebaseToken')).toBe(false);
});

it('keeps the session on refresh network failure and permits a later refresh', async () => {
  const offline = Object.assign(new Error('Offline'), { code: 'auth/network-request-failed' });
  let forceAttempts = 0;
  getIdToken.mockImplementation(async (force?: boolean) => {
    if (force && ++forceAttempts === 1) throw offline;
    if (force) currentToken = 'recovered';
    return currentToken;
  });
  adapter.mockImplementation(async (config) => {
    if (config.headers.get('Authorization') !== 'Bearer recovered') throw unauthorized(config);
    return response(config);
  });

  await expect(apiClient.get('/private')).rejects.toBe(offline);
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(values.get('firebaseToken')).toBe('firebase-current');
  expect(onSessionExpired).not.toHaveBeenCalled();
  await expect(apiClient.get('/private')).resolves.toMatchObject({ status: 200 });
  expect(forceAttempts).toBe(2);
  expect(onSessionExpired).not.toHaveBeenCalled();
});

it.each(['auth/user-disabled', 'auth/user-not-found', 'auth/user-token-expired', 'auth/invalid-user-token'])(
  'expires a definitively invalid Firebase session on refresh: %s', async (code) => {
    const error = Object.assign(new Error(code), { code });
    getIdToken.mockImplementation(async (force?: boolean) => {
      if (force) throw error;
      return currentToken;
    });
    adapter.mockImplementation(async (config) => { throw unauthorized(config); });
    await expect(apiClient.get('/private')).rejects.toBe(error);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(values.has('firebaseToken')).toBe(false);
  },
);

it('replaces the firebase-login body on both the initial request and the retry', async () => {
  const bodies: unknown[] = [];
  const headers: unknown[] = [];
  getIdToken.mockImplementation(async (force?: boolean) => {
    if (force) currentToken = 'refreshed';
    return currentToken;
  });
  adapter.mockImplementation(async (config) => {
    bodies.push(JSON.parse(config.data));
    headers.push(config.headers.get('Authorization'));
    if (bodies.length === 1) throw unauthorized(config);
    return response(config);
  });
  await apiClient.post('/auth/firebase-login', { firebaseToken: 'stale-body' });
  expect(bodies).toEqual([{ firebaseToken: 'firebase-current' }, { firebaseToken: 'refreshed' }]);
  expect(headers).toEqual(['Bearer firebase-current', 'Bearer refreshed']);
  expect(onSessionExpired).not.toHaveBeenCalled();
});

it('does not write or resend when logout occurs during forced refresh', async () => {
  const refresh = deferred<string>();
  const refreshing = deferred<void>();
  getIdToken.mockImplementation((force?: boolean) => {
    if (!force) return Promise.resolve(currentToken);
    refreshing.resolve(undefined);
    return refresh.promise;
  });
  adapter.mockImplementation(async (config) => { throw unauthorized(config); });
  const result = apiClient.get('/private').catch((error) => error);
  await refreshing.promise;
  mockAuth.currentUser = null;
  await resetApiSession();
  onTokenChanged.mockClear();
  storage.setItem.mockClear();
  refresh.resolve('must-not-be-persisted');

  expect(axios.isCancel(await result)).toBe(true);
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(onTokenChanged).not.toHaveBeenCalled();
  expect(onSessionExpired).not.toHaveBeenCalled();
  expect(values.has('firebaseToken')).toBe(false);
});

it('queues logout removal after an in-flight token write and suppresses its callback', async () => {
  const writing = deferred<void>();
  const finishWrite = deferred<void>();
  storage.setItem.mockImplementation(async (key, token) => {
    writing.resolve(undefined);
    await finishWrite.promise;
    values.set(key, token);
  });
  const result = apiClient.get('/private').catch((error) => error);
  await writing.promise;
  const logout = resetApiSession();
  mockAuth.currentUser = null;
  expect(storage.removeItem).not.toHaveBeenCalled();
  finishWrite.resolve(undefined);
  await logout;

  expect(axios.isCancel(await result)).toBe(true);
  expect(values.has('firebaseToken')).toBe(false);
  expect(storage.removeItem).toHaveBeenCalledWith('firebaseToken');
  expect(adapter).not.toHaveBeenCalled();
  expect(onTokenChanged).not.toHaveBeenCalled();
});

it('cancels a token lookup from an old session without overwriting the new session', async () => {
  const lookup = deferred<string>();
  const started = deferred<void>();
  getIdToken.mockImplementationOnce(() => { started.resolve(undefined); return lookup.promise; });
  const oldResult = apiClient.get('/old').catch((error) => error);
  await started.promise;
  await resetApiSession();
  mockAuth.currentUser = { getIdToken: jest.fn().mockResolvedValue('new-session') };
  await apiClient.get('/new');
  onTokenChanged.mockClear();
  lookup.resolve('old-session');

  expect(axios.isCancel(await oldResult)).toBe(true);
  expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['/new']);
  expect(values.get('firebaseToken')).toBe('new-session');
  expect(onTokenChanged).not.toHaveBeenCalled();
});

it('cancels a request reset while waiting for authStateReady before reading any token', async () => {
  const ready = deferred<void>();
  mockAuth.authStateReady.mockReturnValue(ready.promise);
  const result = apiClient.get('/old').catch((error) => error);
  await Promise.resolve();
  expect(mockAuth.authStateReady).toHaveBeenCalledTimes(1);
  await resetApiSession();
  ready.resolve(undefined);
  expect(axios.isCancel(await result)).toBe(true);
  expect(getIdToken).not.toHaveBeenCalled();
  expect(adapter).not.toHaveBeenCalled();
  expect(onTokenChanged).not.toHaveBeenCalled();
});

it('does not let an old refresh clear the new session single-flight refresh', async () => {
  const oldRefresh = deferred<string>();
  const oldRefreshing = deferred<void>();
  getIdToken.mockImplementation((force?: boolean) => {
    if (!force) return Promise.resolve('old-token');
    oldRefreshing.resolve(undefined);
    return oldRefresh.promise;
  });
  adapter.mockImplementation(async (config) => {
    if (config.headers.get('Authorization') !== 'Bearer new-refreshed') throw unauthorized(config);
    return response(config);
  });
  const oldResult = apiClient.get('/old').catch((error) => error);
  await oldRefreshing.promise;
  await resetApiSession();

  const newRefresh = deferred<string>();
  const newRefreshing = deferred<void>();
  let token = 'new-token';
  const newGetIdToken = jest.fn((force?: boolean) => {
    if (!force) return Promise.resolve(token);
    newRefreshing.resolve(undefined);
    return newRefresh.promise.then((value) => { token = value; return value; });
  });
  mockAuth.currentUser = { getIdToken: newGetIdToken };
  const first = apiClient.get('/new-first');
  await newRefreshing.promise;
  oldRefresh.resolve('old-refreshed');
  expect(axios.isCancel(await oldResult)).toBe(true);

  const second = apiClient.get('/new-second');
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(adapter).toHaveBeenCalledTimes(3);
  expect(newGetIdToken.mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  newRefresh.resolve('new-refreshed');
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  expect(adapter).toHaveBeenCalledTimes(5);
  expect(values.get('firebaseToken')).toBe('new-refreshed');
  expect(onTokenChanged).not.toHaveBeenCalledWith('old-refreshed');
  expect(onSessionExpired).not.toHaveBeenCalled();
});

it.each([200, 401])('ignores a late %s response from the old session', async (status) => {
  const pending = deferred<AxiosResponse>();
  const dispatched = deferred<InternalAxiosRequestConfig>();
  adapter.mockImplementationOnce((config) => { dispatched.resolve(config); return pending.promise; });
  const oldResult = apiClient.get('/old').then(
    () => ({ accepted: true, error: undefined }),
    (error: unknown) => ({ accepted: false, error }),
  );
  const oldConfig = await dispatched.promise;
  await resetApiSession();
  mockAuth.currentUser = { getIdToken: jest.fn().mockResolvedValue('new-session') };
  await apiClient.get('/new');
  onTokenChanged.mockClear();
  if (status === 200) pending.resolve(response(oldConfig));
  else pending.reject(unauthorized(oldConfig));

  const result = await oldResult;
  expect(result.accepted).toBe(false);
  if (status === 200) expect(axios.isCancel(result.error)).toBe(true);
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(onSessionExpired).not.toHaveBeenCalled();
  expect(onTokenChanged).not.toHaveBeenCalled();
  expect(values.get('firebaseToken')).toBe('new-session');
});
