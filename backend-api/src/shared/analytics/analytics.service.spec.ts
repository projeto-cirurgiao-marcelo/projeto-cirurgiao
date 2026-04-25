import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvents } from './analytics.events';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    process.env.ANALYTICS_ENABLED = 'false';
    delete process.env.POSTHOG_API_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be no-op when disabled', () => {
    expect(() =>
      service.capture('user-123', AnalyticsEvents.QUIZ_COMPLETED, {
        quizId: 'q1',
        score: 80,
        passed: true,
        timeSpent: 120,
        correctCount: 8,
        totalQuestions: 10,
      })
    ).not.toThrow();
  });

  it('typed event names exist in catalog', () => {
    expect(AnalyticsEvents.QUIZ_GENERATED).toBe('quiz_generated');
    expect(AnalyticsEvents.LEVEL_UP).toBe('level_up');
    expect(AnalyticsEvents.STREAK_BROKEN).toBe('streak_broken');
  });
});
