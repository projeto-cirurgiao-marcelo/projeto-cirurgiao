/**
 * Backward-compat shim.
 *
 * The video quiz feature was split into focused components under
 * `src/components/quiz/` (QuizPlayer + QuizIntro + QuestionCard + QuizResult)
 * during Sprint 1 / Task 13. This file just re-exports the orchestrator so
 * existing imports (`@/components/video/VideoQuiz`) keep working without
 * any churn at the call sites.
 *
 * New code should import `QuizPlayer` from `'../quiz/QuizPlayer'` directly.
 */
import React from 'react';
import { QuizPlayer } from '../quiz/QuizPlayer';

export interface VideoQuizProps {
  videoId: string;
}

export function VideoQuiz(props: VideoQuizProps) {
  return <QuizPlayer {...props} />;
}

export default VideoQuiz;
