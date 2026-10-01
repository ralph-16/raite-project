/**
 * Static onboarding question definitions.
 *
 * These are the first-version predefined questions. They use the same shape
 * as the `onboarding_questions` table (`key`, `type`, `prompt`, `options`,
 * `position`, `depends_on_key`) so a future server response can replace any
 * entry — including generated contextual questions that branch via
 * `dependsOnKey` — without rebuilding the UI. The generic `QuestionField`
 * renderer handles every `OnboardingQuestionType`.
 */

import type { OnboardingQuestion } from "./types";

export const YEAR_LEVEL_OPTIONS = [
  { value: "first_year", label: "1st year" },
  { value: "second_year", label: "2nd year" },
  { value: "third_year", label: "3rd year" },
  { value: "fourth_year", label: "4th year" },
  { value: "graduate", label: "Graduate" },
  { value: "working", label: "Working student" },
] as const;

export const INTEREST_OPTIONS = [
  { value: "building", label: "Building things" },
  { value: "analyzing", label: "Analyzing information" },
  { value: "designing", label: "Designing experiences" },
  { value: "content", label: "Creating content" },
  { value: "technical-problems", label: "Solving technical problems" },
  { value: "people", label: "Working with people" },
  { value: "systems", label: "Working with systems" },
  { value: "technology", label: "Exploring technology" },
] as const;

/** Fallback reference skills. The live list is read from Supabase `skills`
 *  when available (see `app/api/skills`); these examples keep the flow usable
 *  offline and unauthenticated. Slugs match the seeded reference data. */
export const FALLBACK_SKILLS = [
  { slug: "html-css", name: "HTML/CSS" },
  { slug: "javascript", name: "JavaScript" },
  { slug: "typescript", name: "TypeScript" },
  { slug: "python", name: "Python" },
  { slug: "sql", name: "SQL" },
  { slug: "version-control", name: "Git" },
  { slug: "apis", name: "APIs" },
  { slug: "databases", name: "Databases" },
  { slug: "ui-design", name: "UI Design" },
  { slug: "figma", name: "Figma" },
  { slug: "networking", name: "Networking" },
  { slug: "data-analysis", name: "Data Analysis" },
] as const;

export const SKILL_FAMILIARITY_OPTIONS = [
  { value: "not_tried", label: "I haven't tried it" },
  { value: "used", label: "I've used it" },
  { value: "learned", label: "I've learned about it" },
  { value: "comfortable", label: "I'm comfortable with it" },
  { value: "built", label: "I've built something with it" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "school-projects", label: "School projects" },
  { value: "personal-projects", label: "Personal projects" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance work" },
  { value: "organization", label: "Organization work" },
  { value: "part-time", label: "Part-time work" },
  { value: "self-learning", label: "Self-learning" },
  { value: "hackathons", label: "Hackathons" },
  { value: "none-yet", label: "None yet" },
] as const;

export const CAREER_IDEA_OPTIONS = [
  { value: "Software Developer", label: "Software Developer" },
  { value: "Data Analyst", label: "Data Analyst" },
  { value: "UI/UX Designer", label: "UI/UX Designer" },
  { value: "Cybersecurity", label: "Cybersecurity" },
] as const;

export const LOST_EXPLORATION_OPTIONS = [
  { value: "build", label: "Build" },
  { value: "analyze", label: "Analyze" },
  { value: "design", label: "Design" },
  { value: "teach", label: "Teach" },
  { value: "manage", label: "Manage" },
  { value: "help-people", label: "Help people" },
  { value: "information", label: "Work with information" },
  { value: "systems", label: "Work with systems" },
  { value: "create", label: "Create" },
] as const;

export const LEARNING_PREFERENCE_OPTIONS = [
  { value: "short-lessons", label: "Short lessons" },
  { value: "hands-on", label: "Hands-on practice" },
  { value: "projects", label: "Projects" },
  { value: "reading", label: "Reading" },
  { value: "videos", label: "Videos" },
  { value: "examples-first", label: "Examples first" },
  { value: "step-by-step", label: "Step-by-step guidance" },
  { value: "experimenting", label: "Learn by experimenting" },
] as const;

/**
 * Static question catalogue. Positions are stable; a future AI response can
 * insert generated questions (with `dependsOnKey`) between them.
 */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: "year_level",
    type: "single_choice",
    prompt: "What year level are you in?",
    options: [...YEAR_LEVEL_OPTIONS],
    position: 10,
    required: true,
  },
  {
    key: "program",
    type: "open",
    prompt: "What program or course are you taking?",
    position: 11,
    required: true,
  },
  {
    key: "interests",
    type: "multi_choice",
    prompt: "What are you naturally interested in? Select all that apply.",
    options: [...INTEREST_OPTIONS],
    position: 20,
    required: true,
  },
  {
    key: "skills",
    type: "scale",
    prompt: "What have you already tried or know?",
    position: 30,
  },
  {
    key: "experience",
    type: "multi_choice",
    prompt: "What have you actually done so far? Select all that apply.",
    options: [...EXPERIENCE_OPTIONS],
    position: 40,
  },
  {
    key: "career_direction",
    type: "single_choice",
    prompt: "Do you already have a career or industry in mind?",
    options: [
      { value: "has_idea", label: "I have an idea" },
      { value: "unsure", label: "I'm not sure yet" },
    ],
    position: 50,
  },
  {
    key: "target_career",
    type: "open",
    prompt:
      "What job, career, or industry do you have in mind? (Optional — free text.)",
    position: 51,
    dependsOnKey: "career_direction",
  },
  {
    key: "lost_exploration",
    type: "multi_choice",
    prompt:
      "No wrong answers here. What sounds more interesting? Select all that appeal to you.",
    options: [...LOST_EXPLORATION_OPTIONS],
    position: 52,
    dependsOnKey: "career_direction",
  },
  {
    key: "learning_preferences",
    type: "multi_choice",
    prompt: "How do you prefer to learn? Select all that apply.",
    options: [...LEARNING_PREFERENCE_OPTIONS],
    position: 60,
  },
];

export const ACCEPTED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ACCEPTED_RESUME_EXTENSIONS = ".pdf,.docx";
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
