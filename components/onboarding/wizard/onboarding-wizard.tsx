"use client";

/**
 * Mock-mode onboarding wizard (12 steps).
 *
 *   0 welcome · 1 resume (optional) · 2 career in mind (optional)
 *   3–10 the eight questions · 11 finish → /home
 *
 * One state object (`OnboardingState`, `kl.onboarding`) drives every step, so
 * a refresh never loses answers. Every transition persists through
 * `lib/mock/storage` — the only module allowed to touch localStorage. The
 * finish step runs the deterministic scorer (`lib/mock/scoring`) and writes
 * `kl.matches` + `kl.profile`; no AI, no network.
 *
 * Renders nothing when `NEXT_PUBLIC_MOCK_MODE=false`, so the live flow
 * (`components/onboarding/onboarding-flow.tsx`) stays the only behaviour.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { JourneyStones } from "./journey-stones";
import { WelcomeStep } from "./welcome-step";
import { ResumeStep } from "./resume-step";
import { DesiredCareerStep } from "./desired-career-step";
import { QuestionStep } from "./question-step";
import { FinishStep } from "./finish-step";
import { MOCK_MODE } from "@/lib/mock/flags";
import { listQuestions } from "@/lib/mock/questions";
import { clearDemoContent, loadOnboarding, saveOnboarding } from "@/lib/mock/storage";
import type { OnboardingState, QuestionAnswer } from "@/lib/mock/types";

const QUESTION_IDS = listQuestions().map((question) => question.id);

/** The journey order visualized by the stepping stones. */
const STEPS = [
  "welcome",
  "resume",
  "desired",
  ...QUESTION_IDS.map((id) => `q:${id}`),
  "finish",
] as const;

type StepKey = (typeof STEPS)[number];

const EMPTY_STATE: OnboardingState = {
  step: 0,
  completed: false,
  desiredCareer: null,
  resume: null,
  answers: {},
  skipped: [],
  updatedAt: "",
};

export function OnboardingWizard() {
  const [hydrated, setHydrated] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [state, setState] = React.useState<OnboardingState>(EMPTY_STATE);
  /** Career-in-mind draft, controlled so typing survives a step jump. */
  const [enteredText, setEnteredText] = React.useState("");

  /* ---------------- hydration (storage is never read during render) ------ */

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = loadOnboarding() ?? EMPTY_STATE;

    if (params.get("retake") === "1") {
      setState(EMPTY_STATE);
      saveOnboarding(EMPTY_STATE);
      setIndex(0);
    } else if (params.has("step")) {
      const requested = Number(params.get("step"));
      const target = Number.isFinite(requested)
        ? Math.min(STEPS.length - 1, Math.max(0, Math.trunc(requested)))
        : 0;
      setState(stored);
      setIndex(target);
      setEnteredText(stored.desiredCareer ?? "");
    } else {
      // Resume an unfinished run; a finished run starts over at the welcome.
      const target = stored.completed ? 0 : Math.min(stored.step, STEPS.length - 1);
      setState(stored);
      setIndex(target);
      setEnteredText(stored.desiredCareer ?? "");
    }
    setDir(1);
    setHydrated(true);
  }, []);

  const step: StepKey = STEPS[index] ?? "welcome";
  const question = step.startsWith("q:")
    ? listQuestions().find((item) => item.id === step.slice(2))
    : undefined;

  /* ---------------- navigation + persistence (one atomic write) ---------- */

  /** Moves to `target` and persists `patch` in the same write. */
  const goTo = React.useCallback(
    (target: number, patch: Partial<OnboardingState> = {}) => {
      const clamped = Math.min(STEPS.length - 1, Math.max(0, target));
      setDir(clamped >= index ? 1 : -1);
      setIndex(clamped);
      const next: OnboardingState = {
        ...state,
        ...patch,
        step: clamped,
        updatedAt: new Date().toISOString(),
      };
      setState(next);
      saveOnboarding(next);
    },
    [index, state]
  );

  const handleContinue = React.useCallback(() => {
    if (step === "finish") return; // the finish step drives itself
    goTo(index + 1);
  }, [goTo, index, step]);

  const handleBack = React.useCallback(() => goTo(index - 1), [goTo, index]);

  /** Footer "Skip this one": no answer, id logged as skipped, then onward. */
  const handleSkipQuestion = React.useCallback(() => {
    if (!question) return;
    const answers = { ...state.answers };
    delete answers[question.id];
    const skipped = state.skipped.includes(question.id)
      ? state.skipped
      : [...state.skipped, question.id];
    goTo(index + 1, { answers, skipped });
  }, [goTo, index, question, state]);

  const handleAnswer = React.useCallback(
    (questionId: string, answer: QuestionAnswer | null) => {
      const answers = { ...state.answers };
      if (answer === null) {
        delete answers[questionId];
      } else {
        answers[questionId] = answer;
      }
      const next: OnboardingState = {
        ...state,
        answers,
        updatedAt: new Date().toISOString(),
      };
      setState(next);
      saveOnboarding(next);
    },
    [state]
  );

  const handleDesiredCareer = React.useCallback(
    (value: string | null) => {
      setEnteredText(value ?? "");
      const next: OnboardingState = {
        ...state,
        desiredCareer: value,
        updatedAt: new Date().toISOString(),
      };
      setState(next);
      saveOnboarding(next);
    },
    [state]
  );

  const handleResume = React.useCallback(
    (resume: OnboardingState["resume"]) => {
      const next: OnboardingState = {
        ...state,
        resume,
        updatedAt: new Date().toISOString(),
      };
      setState(next);
      saveOnboarding(next);
    },
    [state]
  );

  /** "Skip for now" on the resume step clears the file and moves on. */
  const handleResumeSkip = React.useCallback(
    () => goTo(index + 1, { resume: null }),
    [goTo, index]
  );

  /** Welcome: wipe demo content, keep the account, session and theme. */
  const handleStartOver = React.useCallback(() => {
    clearDemoContent();
    setState(EMPTY_STATE);
    setEnteredText("");
    setIndex(0);
    setDir(1);
    saveOnboarding(EMPTY_STATE);
  }, []);

  /* ---------------- Enter = Continue ---------------- */

  React.useEffect(() => {
    if (!hydrated) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      // Textareas handle Enter themselves (Shift + Enter = newline); buttons
      // and links already activate on Enter natively.
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON" || tag === "A") return;
      if (step === "finish") return;
      event.preventDefault();
      handleContinue();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleContinue, hydrated, step]);

  if (!MOCK_MODE) return null;

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col gap-4 px-6 py-10">
        <div className="shimmer h-3 w-48 rounded bg-muted" aria-hidden="true" />
        <div className="shimmer h-10 w-3/4 rounded bg-muted" aria-hidden="true" />
        <p className="sr-only" role="status">
          Loading onboarding…
        </p>
      </main>
    );
  }

  const canGoBack = index > 0 && step !== "finish";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col px-6">
      <div className="flex items-center justify-between gap-6 pt-8">
        <JourneyStones total={STEPS.length} current={index} />
        <p className="shrink-0 font-sans text-xs text-muted-foreground">
          {step === "finish" ? "Final step" : `Step ${index + 1} of ${STEPS.length}`}
        </p>
      </div>

      <main className="flex flex-1 flex-col justify-center py-10">
        <div key={step} className={dir === 1 ? "animate-step-in-next" : "animate-step-in-prev"}>
          <StepContent
            step={step}
            state={state}
            question={question}
            enteredText={enteredText}
            onAnswer={handleAnswer}
            onDesiredCareer={handleDesiredCareer}
            onResume={handleResume}
            onResumeSkip={handleResumeSkip}
            onStartOver={handleStartOver}
          />
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-background/90 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleBack} disabled={!canGoBack}>
              Back
            </Button>
            {question ? (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleSkipQuestion}
              >
                Skip this one
              </Button>
            ) : null}
          </div>
          {step === "finish" ? (
            <p className="font-sans text-xs text-muted-foreground">Almost there…</p>
          ) : (
            <Button type="button" id="onboarding-continue" onClick={handleContinue}>
              {step === "welcome" ? "Let's start" : "Continue"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

interface StepContentProps {
  step: StepKey;
  state: OnboardingState;
  question: ReturnType<typeof listQuestions>[number] | undefined;
  enteredText: string;
  onAnswer: (questionId: string, answer: QuestionAnswer | null) => void;
  onDesiredCareer: (value: string | null) => void;
  onResume: (resume: OnboardingState["resume"]) => void;
  onResumeSkip: () => void;
  onStartOver: () => void;
}

/** Pure switch: the wizard body stays about navigation, not step details. */
function StepContent({
  step,
  state,
  question,
  enteredText,
  onAnswer,
  onDesiredCareer,
  onResume,
  onResumeSkip,
  onStartOver,
}: StepContentProps) {
  if (step === "welcome") return <WelcomeStep onStartOver={onStartOver} />;
  if (step === "resume") {
    return <ResumeStep resume={state.resume} onResume={onResume} onSkip={onResumeSkip} />;
  }
  if (step === "desired") {
    return (
      <DesiredCareerStep
        value={state.desiredCareer}
        enteredText={enteredText}
        onChange={onDesiredCareer}
      />
    );
  }
  if (step === "finish") return <FinishStep state={state} />;
  if (question) {
    return (
      <QuestionStep
        question={question}
        answer={state.answers[question.id]}
        onChange={(answer) => onAnswer(question.id, answer)}
      />
    );
  }
  // Unreachable — every STEPS key is handled. A safe fallback keeps the
  // wizard usable if a data edit ever changes the step list.
  return (
    <div className="max-w-md">
      <h2 className="font-sans font-bold tracking-tight text-3xl">Let&apos;s keep going</h2>
      <p className="mt-2 text-muted-foreground">That step went missing. Use Back to return.</p>
    </div>
  );
}
