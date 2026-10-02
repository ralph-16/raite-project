"use client";

import * as React from "react";

import type { ExplorerProfile } from "@/lib/profiler/schema";
import {
  GUIDED_STORAGE_KEY,
  HOME_SNAPSHOT_KEY,
  INITIAL_GUIDED_STATE,
  toOnboardingState,
  type GuidedAnswer,
  type GuidedState,
  type HomeSnapshot,
} from "@/lib/onboarding/guided";
import type { ParsedResume } from "@/lib/resume/parse";
import { AspirationsStage } from "./aspirations-stage";
import { LoryIntroduction } from "./lory-introduction";
import { YEAR_LEVEL_OPTIONS } from "@/lib/onboarding/questions";
import { OnboardingCompletion } from "./onboarding-completion";
import { OnboardingShell } from "./onboarding-shell";
import { QaSurveyStage, type QaQuestion } from "./qa-survey-stage";
import { ResumeUploadStage } from "./resume-upload-stage";
import { Button } from "@/components/ui/button";
import { LoryAvatar } from "./lory-avatar";

type Stage = "intro" | "resume" | "aspirations" | "qa" | "building" | "done";

const STAGE_ORDER: Stage[] = ["intro", "resume", "aspirations", "qa", "building", "done"];

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function loadStored(): { state: GuidedState; stage: number } | null {
  try {
    const raw = window.localStorage.getItem(GUIDED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: GuidedState; stage?: number };
    if (!parsed.state || typeof parsed.stage !== "number") return null;
    return {
      state: { ...INITIAL_GUIDED_STATE, ...parsed.state },
      stage: Math.min(Math.max(parsed.stage, 0), STAGE_ORDER.length - 1),
    };
  } catch {
    return null;
  }
}

/**
 * Guided onboarding v2: intro → resume (optional) → aspirations (optional)
 * → AI contextual Q&A → completion (profile → /home).
 *
 * Single state object + localStorage so refresh never loses answers. Every
 * stage has Back and Skip. No career is ever assigned here.
 */
export function OnboardingFlow() {
  const [stageIndex, setStageIndex] = React.useState(0);
  const [state, setState] = React.useState<GuidedState>(INITIAL_GUIDED_STATE);
  const [hydrated, setHydrated] = React.useState(false);

  const [consent, setConsent] = React.useState(false);

  const [question, setQuestion] = React.useState<QaQuestion | null>(null);
  const [qaLoading, setQaLoading] = React.useState(false);
  const [qaError, setQaError] = React.useState<string | null>(null);

  const [buildError, setBuildError] = React.useState<string | null>(null);
  const [isBuilding, setIsBuilding] = React.useState(false);
  const [profile, setProfile] = React.useState<ExplorerProfile | null>(null);
  const [modelLabel, setModelLabel] = React.useState<string | null>(null);
  const [completionNote, setCompletionNote] = React.useState<string | null>(null);

  const headingRef = React.useRef<HTMLDivElement>(null);
  const stage = STAGE_ORDER[stageIndex] ?? "intro";

  React.useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setState(stored.state);
      // Never restore into a transient stage.
      const restored = STAGE_ORDER[stored.stage];
      setStageIndex(
        restored === "building" ? STAGE_ORDER.indexOf("qa") : stored.stage
      );
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || stage === "done") return;
    try {
      window.localStorage.setItem(
        GUIDED_STORAGE_KEY,
        JSON.stringify({ state, stage: stageIndex })
      );
    } catch {
      // Private mode — the flow still works for this visit.
    }
  }, [state, stageIndex, hydrated, stage]);

  React.useEffect(() => {
    if (hydrated) headingRef.current?.focus();
  }, [stageIndex, hydrated]);

  const patch = (next: Partial<GuidedState>) =>
    setState((prev) => ({ ...prev, ...next }));

  const goTo = (index: number) =>
    setStageIndex(Math.min(Math.max(index, 0), STAGE_ORDER.length - 1));

  /* ---------------- resume ---------------- */

  const handleResumeFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const okType =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "pdf" ||
      ext === "docx";
    if (!okType) {
      patch({
        resume: {
          status: "invalid",
          fileName: file.name,
          consent,
          error: "Only PDF or DOCX resumes are supported.",
        },
      });
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      patch({
        resume: {
          status: "invalid",
          fileName: file.name,
          consent,
          error: "Keep the resume under 5 MB.",
        },
      });
      return;
    }
    if (!consent) {
      patch({
        resume: {
          status: "invalid",
          fileName: file.name,
          consent,
          error: "Tick the consent box first so Lory may read your resume.",
        },
      });
      return;
    }

    patch({ resume: { status: "parsing", fileName: file.name, consent } });
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("consent", "yes");
      const response = await fetch("/api/resume/parse", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        status?: string;
        parsed?: ParsedResume;
        message?: string;
      };
      if (!response.ok || data.status !== "ok" || !data.parsed) {
        patch({
          resume: {
            status: response.ok ? "invalid" : "failed",
            fileName: file.name,
            consent,
            error:
              data.message ??
              "Lory couldn't read that resume. Try again or skip.",
          },
        });
        return;
      }
      patch({
        resume: {
          status: "parsed",
          fileName: file.name,
          consent,
          parsed: data.parsed,
          correctedSkills: (data.parsed.skills ?? []).join(", "),
        },
      });
    } catch {
      patch({
        resume: {
          status: "failed",
          fileName: file.name,
          consent,
          error: "Unable to reach Lory right now. Try again or skip.",
        },
      });
    }
  };

  /* ---------------- Q&A ---------------- */

  /** Guards against double-clicks and overlapping fetches. */
  const qaInFlight = React.useRef(false);

  const fetchNext = React.useCallback(
    async (answers: GuidedAnswer[]) => {
      if (qaInFlight.current) return;
      qaInFlight.current = true;
      setQaLoading(true);
      setQaError(null);
      try {
        const response = await fetch("/api/onboarding/next-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: answers.map((a) => ({
              key: a.key,
              topic: a.topic,
              prompt: a.prompt,
              answer: a.answer,
            })),
            aspirations: state.aspirations.text.trim() || undefined,
            unsure: state.aspirations.unsure,
            resumeSummary: state.resume.parsed?.summary || undefined,
          }),
        });
        const data = (await response.json()) as QaQuestion & {
          status?: string;
          done?: boolean;
          message?: string;
        };
        if (!response.ok || data.status === "error") {
          setQaError(data.message ?? "Lory lost the thread. Try again.");
          return;
        }
        if (data.done) {
          patch({ qaDone: true });
          goTo(STAGE_ORDER.indexOf("building"));
          return;
        }
        setQuestion(data);
      } catch {
        setQaError("Unable to reach Lory right now. Try again.");
      } finally {
        setQaLoading(false);
        qaInFlight.current = false;
      }
    },
    // aspirations/resume are stage-stable while Q&A runs; answers passed explicitly.
    [state.aspirations.text, state.aspirations.unsure, state.resume.parsed?.summary]
  );

  // First question when entering the Q&A stage.
  React.useEffect(() => {
    if (hydrated && stage === "qa" && !question && !qaLoading && !qaError) {
      void fetchNext(state.answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, stage]);

  const handleQaAnswer = (answer: GuidedAnswer) => {
    const next = [...state.answers, answer];
    patch({ answers: next });
    setQuestion(null);
    if (next.length >= 8) {
      patch({ qaDone: true });
      goTo(STAGE_ORDER.indexOf("building"));
      return;
    }
    void fetchNext(next);
  };

  /* ---------------- completion ---------------- */

  const buildProfile = React.useCallback(async () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setBuildError(null);
    try {
      const onboarding = toOnboardingState(state);
      const response = await fetch("/api/profiler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding,
          context: {
            answers: state.answers,
            resumeSummary: state.resume.parsed?.summary || undefined,
          },
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        profile?: ExplorerProfile;
        model?: string;
        message?: string;
      };

      let resultProfile: ExplorerProfile | null = null;
      let note: string | null = null;
      if (response.ok && data.status === "ok" && data.profile) {
        resultProfile = data.profile;
        setModelLabel(data.model ?? null);
      } else if (response.status === 400) {
        // Skipped past the minimum: complete honestly without a profile.
        note =
          "You skipped the basics Lory needs for a profile, so there's nothing generated yet — your answers are still saved on this device.";
      } else {
        setBuildError(
          data.message ?? "Lory couldn't build your profile. Try again."
        );
        return;
      }

      setProfile(resultProfile);
      setCompletionNote(note);
      const snapshot: HomeSnapshot = {
        profile: resultProfile,
        model: data.model ?? null,
        program: onboarding.program || undefined,
        yearLevel: onboarding.yearLevel,
        interests: onboarding.interests,
        note: note ?? undefined,
        completedAt: new Date().toISOString(),
        dev: true,
      };
      try {
        window.localStorage.setItem(HOME_SNAPSHOT_KEY, JSON.stringify(snapshot));
        window.localStorage.removeItem(GUIDED_STORAGE_KEY);
      } catch {
        // Non-fatal.
      }
      goTo(STAGE_ORDER.indexOf("done"));
    } catch {
      setBuildError("Unable to reach Lory right now. Try again.");
    } finally {
      setIsBuilding(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  React.useEffect(() => {
    if (hydrated && stage === "building") void buildProfile();
  }, [hydrated, stage, buildProfile]);

  const continueWithoutProfile = () => {
    const snapshot: HomeSnapshot = {
      profile: null,
      model: null,
      interests: [],
      note: "Profile was skipped after a generation error.",
      completedAt: new Date().toISOString(),
      dev: true,
    };
    try {
      window.localStorage.setItem(HOME_SNAPSHOT_KEY, JSON.stringify(snapshot));
      window.localStorage.removeItem(GUIDED_STORAGE_KEY);
    } catch {
      // Non-fatal.
    }
    goTo(STAGE_ORDER.indexOf("done"));
  };

  /* ---------------- render ---------------- */

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-6 py-10">
        <div className="shimmer h-4 w-32 rounded bg-muted" aria-hidden="true" />
        <div className="shimmer h-10 w-3/4 rounded bg-muted" aria-hidden="true" />
        <p className="sr-only" role="status">
          Loading onboarding...
        </p>
      </main>
    );
  }

  if (stage === "intro") {
    return (
      <main>
        <LoryIntroduction onBegin={() => goTo(1)} />
      </main>
    );
  }

  if (stage === "done") {
    const display = toOnboardingState(state);
    const yearLabel =
      YEAR_LEVEL_OPTIONS.find((o) => o.value === display.yearLevel)?.label ??
      undefined;
    return (
      <main>
        <OnboardingCompletion
          profile={profile}
          program={display.program || undefined}
          yearLevelLabel={yearLabel}
          interests={display.interests}
          modelLabel={modelLabel}
          persistDetail={completionNote}
        />
      </main>
    );
  }

  const meta: Record<Stage, { n: number | null; title: string; lory?: string }> = {
    intro: { n: null, title: "Meet Lory" },
    resume: {
      n: 1,
      title: "Optional resume",
      lory: "Your resume only adds context — what you tell me matters most.",
    },
    aspirations: {
      n: 2,
      title: "Where are you headed?",
      lory: "An idea, a hunch, or a happy shrug — all good answers.",
    },
    qa: {
      n: 3,
      title: "A few quick questions",
      lory: "Short chat, no wrong answers. Skip anything you like.",
    },
    building: { n: null, title: "Putting your profile together" },
    done: { n: null, title: "Done" },
  };

  return (
    <main>
      <div ref={headingRef} tabIndex={-1} className="outline-none">
        <OnboardingShell
          stepNumber={meta[stage].n}
          totalSteps={4}
          title={meta[stage].title}
          loryMessage={meta[stage].lory}
        >
          {stage === "resume" ? (
            <div className="flex flex-col gap-4">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span>
                  I agree Lory may read my resume to fill in my profile. My
                  resume is optional and I can skip this entirely.
                </span>
              </label>
              <ResumeUploadStage
                fileName={state.resume.fileName}
                status={state.resume.status}
                error={state.resume.error}
                parsed={state.resume.parsed}
                correctedSkills={
                  state.resume.correctedSkills ??
                  (state.resume.parsed?.skills ?? []).join(", ")
                }
                onFile={(file) => void handleResumeFile(file)}
                onSkillsEdit={(value) =>
                  patch({
                    resume: { ...state.resume, correctedSkills: value },
                  })
                }
                onBack={() => goTo(stageIndex - 1)}
                onContinue={() => goTo(stageIndex + 1)}
                onSkip={() => {
                  patch({
                    resume: { status: "skipped", consent },
                  });
                  goTo(stageIndex + 1);
                }}
              />
            </div>
          ) : null}

          {stage === "aspirations" ? (
            <AspirationsStage
              text={state.aspirations.text}
              unsure={state.aspirations.unsure}
              onText={(text) =>
                patch({ aspirations: { ...state.aspirations, text } })
              }
              onUnsure={(unsure) =>
                patch({ aspirations: { ...state.aspirations, unsure } })
              }
              onBack={() => goTo(stageIndex - 1)}
              onContinue={() => goTo(stageIndex + 1)}
              onSkip={() => {
                patch({
                  aspirations: { text: "", unsure: false, skipped: true },
                });
                goTo(stageIndex + 1);
              }}
            />
          ) : null}

          {stage === "qa" ? (
            <QaSurveyStage
              question={question}
              loading={qaLoading}
              loadError={qaError}
              answeredCount={state.answers.length}
              onAnswer={handleQaAnswer}
              onRetry={() => void fetchNext(state.answers)}
              onBack={() => goTo(stageIndex - 1)}
              onSkipStep={() => {
                patch({ qaDone: true });
                goTo(STAGE_ORDER.indexOf("building"));
              }}
            />
          ) : null}

          {stage === "building" ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <LoryAvatar
                size="lg"
                state={buildError ? "confused" : "thinking"}
              />
              {buildError ? (
                <div className="flex max-w-md flex-col gap-3">
                  <p role="alert" className="text-sm text-destructive">
                    {buildError}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button type="button" onClick={() => void buildProfile()}>
                      Try again
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={continueWithoutProfile}
                    >
                      Continue without profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex max-w-md flex-col gap-2" role="status">
                  <div className="shimmer h-4 w-56 rounded bg-muted" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    {isBuilding
                      ? "Lory is putting your profile together..."
                      : "Getting ready..."}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </OnboardingShell>
      </div>
    </main>
  );
}
