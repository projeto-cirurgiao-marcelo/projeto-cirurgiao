# Sprint 1 — Automated Verification

Date: 2026-04-25
Branch: feat/quiz-gamification-foundation
Worktree: .worktrees/quiz-gamification-foundation

## Mobile

- jest: 14 suites, 47 tests passing
- tsc: 0 new errors (3 pre-existing in src/tw/)
- New components: XpBurst, ConfettiSkia, GlowPulse, ScreenShake, ConfidenceRating, ComboMeter
- New hooks: useAudioOutput, useHaptic, useSound
- New store: quiz-store (Zustand)
- Refator: VideoQuiz monolito -> 4 split components + shim

## Backend

- jest: 12 suites, 168 tests passing
- build: green (webpack compiled successfully in ~15s)
- prisma migrate: schema in sync (32 migrations applied)
- New service: XpCalculatorService (DB-driven formula)
- DTO update: SubmitQuizDto carries confidence per answer
- Service update: quiz-attempts.service uses XpCalculator + persists confidence/xpAwarded/comboMax

## DB Sanity

- xp_rules.quiz_question: active=t, multiplierJson is object
- quiz_answers.confidence: column exists (ConfidenceLevel enum)
- quiz_answers.xpAwarded: column exists (integer)
- quiz_attempts.comboMax: column exists (integer)

## Manual smoke (deferred to user)

User will run Metro + Expo Go on real device to validate end-to-end:
1. Start backend: `cd backend-api && npm run start:dev`
2. Start Metro: `cd mobile-app && npm start`
3. Login + navigate to a video with quiz
4. Submit a quiz; verify:
   - Confetti on pass
   - XpBurst on each answer
   - ConfidenceRating panel after each answer
   - ComboMeter visible after combo >=3
   - Haptic feedback on iOS device
   - Backend log: per-question XP rows + aggregate quiz_pass
5. Verify via psql:
   ```
   SELECT confidence, "xpAwarded" FROM quiz_answers ORDER BY "createdAt" DESC LIMIT 10;
   ```

## Known limitations / follow-up

- Audio assets pending — useSound is no-op silenciado
- Wrong-answer juice (shake) currently dead code (correctAnswer hidden by backend) — Sprint 2 decision
- Difficulty fallback to MEDIUM for all questions (QuizQuestion lacks Difficulty column) — Sprint 2 schema add
