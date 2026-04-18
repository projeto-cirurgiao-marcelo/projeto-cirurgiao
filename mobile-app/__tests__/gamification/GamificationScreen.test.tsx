/**
 * Smoke test da tela de Gamificacao.
 *
 * Valida renderizacao basica com dados mockados da store (profile com XP,
 * level, streak). Objetivo: detectar regressao em imports/plugin de icone/etc.
 *
 * Nao exercita tabs alem do overview — switchar de tab via FlatList + pager
 * pesaria muito pro smoke. Suficiente confirmar que o layer entra sem crash.
 */
import { render } from '@testing-library/react-native';
import GamificationScreen from '../../app/profile/gamification';

// Mock da gamification store. O componente destructura varios fetchers e
// data fields — basta cada um ser jest.fn() e ter data coerente.
jest.mock('../../src/stores/gamification-store', () => {
  const mockProfile = {
    xp: { total: 1250, weekEarned: 180 },
    level: {
      current: 3,
      title: 'Residente',
      color: '#3B82F6',
      xpForNextLevel: 2000,
      progressPercent: 62,
    },
    streak: { current: 5, longest: 12 },
    stats: {
      totalWatchTimeMinutes: 340,
      coursesCompleted: 1,
      videosCompleted: 23,
      forumTopics: 2,
      forumReplies: 8,
    },
    recentXpHistory: [],
  };
  const state = {
    profile: mockProfile,
    badges: [],
    badgesSummary: { unlocked: 0, total: 0 },
    leaderboard: null,
    challenges: { daily: [], weekly: [], special: [], completedToday: 0, totalCompleted: 0 },
    isLoadingLeaderboard: false,
    isLoadingChallenges: false,
    fetchProfile: jest.fn(),
    fetchBadges: jest.fn(),
    fetchLeaderboard: jest.fn(),
    fetchChallenges: jest.fn(),
    claimChallenge: jest.fn(),
  };
  return {
    __esModule: true,
    useGamificationStore: () => state,
  };
});

describe('<GamificationScreen />', () => {
  it('renderiza hero card com level title e XP', () => {
    const { getByText } = render(<GamificationScreen />);

    // Level title mockado.
    expect(getByText('Residente')).toBeTruthy();
    // XP bar label: "1250 / 2000 XP"
    expect(getByText('1250 / 2000 XP')).toBeTruthy();
    // Streak display: "5 dias"
    expect(getByText('5 dias')).toBeTruthy();
  });

  it('renderiza header "Gamificacao"', () => {
    const { getByText } = render(<GamificationScreen />);
    expect(getByText('Gamificacao')).toBeTruthy();
  });

  it('dispara os 4 fetchers no mount', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useGamificationStore } = require('../../src/stores/gamification-store');
    const state = useGamificationStore();
    render(<GamificationScreen />);
    expect(state.fetchProfile).toHaveBeenCalled();
    expect(state.fetchBadges).toHaveBeenCalled();
    expect(state.fetchLeaderboard).toHaveBeenCalledWith('weekly');
    expect(state.fetchChallenges).toHaveBeenCalled();
  });
});
