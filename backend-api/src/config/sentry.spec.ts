import { scrubEvent } from './sentry';
import type { ErrorEvent } from '@sentry/node';

describe('scrubEvent (Sentry PII scrubbing)', () => {
  it('redige headers sensíveis e descarta cookies/body da request', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer abc.def',
          cookie: 'session=xyz',
          'x-webhook-secret': 'shh',
          'user-agent': 'jest',
        },
        cookies: { session: 'xyz' },
        data: { password: 'hunter2' },
      },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(out.request!.headers).toEqual({
      Authorization: '[Redacted]',
      cookie: '[Redacted]',
      'x-webhook-secret': '[Redacted]',
      'user-agent': 'jest',
    });
    expect(out.request!.cookies).toBeUndefined();
    expect(out.request!.data).toBeUndefined();
  });

  it('redige campos sensíveis em profundidade em extra/contexts', () => {
    const event = {
      extra: {
        refreshToken: 'r1',
        nested: { firebaseToken: 'f1', keep: 'ok' },
        list: [{ jwt: 'j1' }],
      },
      contexts: { auth: { secret: 's1', userId: 'u1' } },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event) as any;

    expect(out.extra.refreshToken).toBe('[Redacted]');
    expect(out.extra.nested.firebaseToken).toBe('[Redacted]');
    expect(out.extra.nested.keep).toBe('ok');
    expect(out.extra.list[0].jwt).toBe('[Redacted]');
    expect(out.contexts.auth.secret).toBe('[Redacted]');
    expect(out.contexts.auth.userId).toBe('u1');
  });

  it('não quebra quando não há request/extra/contexts', () => {
    const event = { message: 'boom' } as unknown as ErrorEvent;
    expect(() => scrubEvent(event)).not.toThrow();
  });
});
