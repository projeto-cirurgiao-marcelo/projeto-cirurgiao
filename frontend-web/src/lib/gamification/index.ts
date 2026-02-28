import { gamificationApi } from './gamification-api';
import { gamificationMock } from './gamification-mock';

/**
 * Toggle entre mock e API real via variavel de ambiente
 * Setar NEXT_PUBLIC_USE_MOCK_GAMIFICATION=true no .env.local para usar mocks
 */
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_GAMIFICATION === 'true';

export const gamificationService = useMock ? gamificationMock : gamificationApi;

// Re-exports para conveniencia
export * from './types';
export * from './constants';
export { gamificationApi } from './gamification-api';
export { gamificationMock } from './gamification-mock';
