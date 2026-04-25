import { useQuizStore } from '../../src/stores/quiz-store';

describe('quiz-store', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
  });

  it('startQuiz initializes state', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }];
    useQuizStore.getState().startQuiz('quiz-uuid', questions);
    const s = useQuizStore.getState();
    expect(s.quizId).toBe('quiz-uuid');
    expect(s.questions).toEqual(questions);
    expect(s.currentIndex).toBe(0);
    expect(s.combo).toBe(0);
  });

  it('selectAnswer + setConfidence updates the same questionId entry', () => {
    useQuizStore.getState().startQuiz('q', [{ id: 'q1' }]);
    useQuizStore.getState().selectAnswer('q1', 2);
    useQuizStore.getState().setConfidence('q1', 'KNEW');
    const a = useQuizStore.getState().answers.get('q1');
    expect(a).toEqual({ questionId: 'q1', answer: 2, confidence: 'KNEW' });
  });

  it('markCorrectness=true increments combo + comboMax', () => {
    useQuizStore.getState().startQuiz('q', [{ id: 'q1' }, { id: 'q2' }]);
    useQuizStore.getState().markCorrectness('q1', true);
    useQuizStore.getState().markCorrectness('q2', true);
    const s = useQuizStore.getState();
    expect(s.combo).toBe(2);
    expect(s.comboMax).toBe(2);
  });

  it('markCorrectness=false zeros combo but preserves comboMax', () => {
    const store = useQuizStore.getState();
    store.startQuiz('q', [{ id: 'q1' }, { id: 'q2' }]);
    store.markCorrectness('q1', true);
    store.markCorrectness('q2', false);
    const s = useQuizStore.getState();
    expect(s.combo).toBe(0);
    expect(s.comboMax).toBe(1);
  });

  it('next clamps to questions.length', () => {
    useQuizStore.getState().startQuiz('q', [{ id: 'q1' }]);
    useQuizStore.getState().next();
    useQuizStore.getState().next();
    expect(useQuizStore.getState().currentIndex).toBe(1); // length=1, clamped
  });

  it('reset returns store to initial state', () => {
    useQuizStore.getState().startQuiz('q', [{ id: 'q1' }]);
    useQuizStore.getState().selectAnswer('q1', 0);
    useQuizStore.getState().reset();
    const s = useQuizStore.getState();
    expect(s.quizId).toBeNull();
    expect(s.questions).toEqual([]);
    expect(s.answers.size).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.startedAt).toBeNull();
  });
});
