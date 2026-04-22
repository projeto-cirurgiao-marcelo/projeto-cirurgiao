/**
 * Smoke test do logger dedicado (commit 3c6dafc).
 *
 * Valida o contrato:
 * - logger.log/debug/info sao devonly (aqui __DEV__=true em Jest, entao imprimem).
 * - logger.warn/error imprimem sempre.
 * - Chamadas passam args atraves (array flat, sem serializacao).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const global: any;

describe('logger', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logger.log imprime quando __DEV__=true', () => {
    global.__DEV__ = true;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logger } = require('../../src/lib/logger');
    logger.log('hello');
    expect(logSpy).toHaveBeenCalledWith('hello');
  });

  it('logger.log NAO imprime quando __DEV__=false', () => {
    jest.resetModules();
    global.__DEV__ = false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logger } = require('../../src/lib/logger');
    logger.log('silent');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logger.warn imprime SEMPRE (inclusive quando __DEV__=false)', () => {
    jest.resetModules();
    global.__DEV__ = false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logger } = require('../../src/lib/logger');
    logger.warn('danger');
    expect(warnSpy).toHaveBeenCalledWith('danger');
  });

  it('logger.error imprime SEMPRE (inclusive quando __DEV__=false)', () => {
    jest.resetModules();
    global.__DEV__ = false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logger } = require('../../src/lib/logger');
    const err = new Error('boom');
    logger.error('[test]', err);
    expect(errorSpy).toHaveBeenCalledWith('[test]', err);
  });
});
