import { describeDevice } from '../../src/lib/device';

describe('describeDevice', () => {
  it('iOS: iPhone ou iPad pelo idiom', () => {
    expect(describeDevice('ios', { interfaceIdiom: 'phone' })).toBe('iPhone');
    expect(describeDevice('ios', { interfaceIdiom: 'pad' })).toBe('iPad');
  });

  it('Android: marca + modelo, com fallback', () => {
    expect(describeDevice('android', { Brand: 'samsung', Model: 'SM-A515F' })).toBe('Samsung SM-A515F');
    expect(describeDevice('android', {})).toBe('Android');
  });
});
