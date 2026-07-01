import { scrubEvent, scrubBreadcrumb, isSentryEnabled } from '../../src/config/sentry';

describe('sentry scrubbing (mobile)', () => {
  it('redige headers, descarta body e redige campos sensíveis (incl. email)', () => {
    const event: any = {
      request: {
        headers: { Authorization: 'Bearer x', 'user-agent': 'jest' },
        cookies: { s: '1' },
        data: { password: 'p' },
      },
      extra: { firebaseToken: 'f', refreshToken: 'r', keep: 'ok' },
      contexts: { user: { email: 'a@b.com', id: 'u1' } },
    };

    const out = scrubEvent(event);

    expect(out.request.headers.Authorization).toBe('[Redacted]');
    expect(out.request.headers['user-agent']).toBe('jest');
    expect(out.request.cookies).toBeUndefined();
    expect(out.request.data).toBeUndefined();
    expect(out.extra.firebaseToken).toBe('[Redacted]');
    expect(out.extra.refreshToken).toBe('[Redacted]');
    expect(out.extra.keep).toBe('ok');
    expect(out.contexts.user.email).toBe('[Redacted]');
    expect(out.contexts.user.id).toBe('u1');
  });

  it('scrubBreadcrumb redige data de breadcrumb', () => {
    const out = scrubBreadcrumb({ category: 'xhr', data: { token: 't', url: '/x' } });
    expect(out.data.token).toBe('[Redacted]');
    expect(out.data.url).toBe('/x');
  });

  it('isSentryEnabled é false sem EXPO_PUBLIC_SENTRY_DSN', () => {
    expect(isSentryEnabled()).toBe(false);
  });
});
