import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('retorna status ok com timestamp ISO', () => {
    const res = new HealthController().check();
    expect(res.status).toBe('ok');
    expect(() => new Date(res.timestamp).toISOString()).not.toThrow();
    expect(new Date(res.timestamp).toISOString()).toBe(res.timestamp);
  });
});
