# AGENTS.md — Ka-Lakbay Design System

> Agents and LLMs: follow these rules when writing, reviewing, or refactoring any UI in this repo.
>
> This file is the merged source of truth. `AGENTS-update.md` was the preferred
> source on any conflict and has been folded in here — if a rule below
> contradicts an older note elsewhere, this file wins.

---

## 1. Product identity

| Fact | Value |
|---|---|
| App name | **Ka-Lakbay** |
| Mascot | **Lory**: a cheerful, whimsical female parrot. Orange-red body, blue and yellow wings/tail, blue hoodie and sneakers. Guide and companion, never an authority. (Any "Lio" in older notes is a typo. Use **Lory**.) |
| Purpose | AI-powered student career and learning navigator |
| Core loop | Discover → Diagnose → Map → Learn → Prove → Reassess |
| Audience | Students (not schools, teachers, or admins) |

Ka-Lakbay is designed around the idea that students do not need to already know
exactly what career they want. It helps them explore possibilities, understand
the skills behind those possibilities, develop those skills, and demonstrate
what they can do. The student remains the decision-maker.

### Product guardrails (affect UI copy and layout)

- **Not** a job board, resume builder, course marketplace, generic chatbot, career quiz, or LMS. Do not build screens for those.
- The AI **suggests possible paths**. It never decides a student's career. Use: *possible path, career path, alignment, explore, relevant to you, skills to develop, possible next step, explore what fits, see where this could lead*. Avoid: *match, best career, perfect career, you should become, guaranteed, AI knows your ideal career*.
- Resume upload is **optional**. Every flow must work fully with "Skip for now".
- Every place that collects data explains **why** it is collected. AI involvement is always visible (label AI-generated content: "Lory suggests", "AI-generated"). Do not make AI output look like human-authored fact.
- Never imply recommendations are guaranteed outcomes.
- Track what the student can **demonstrate**, not only what they consumed. Finishing a resource does not equal mastery.
- Support English and Filipino copy. Keep strings out of JSX where practical so they can be translated.
- The student is the protagonist; Ka-Lakbay is the guide. Normalize uncertainty ("You don't have to know yet."). No fear-based or manipulative language.
- RAITE 2026 context: the product must explain its educational problem, why AI is needed, and who benefits — but the landing page must still feel like a real student product, not a hackathon poster.

---

## 2. Design philosophy

Ka-Lakbay's visual identity is: playful, whimsical, expressive, youthful,
editorial, pop-culture aware, Gen-Z oriented, typographic, energetic, slightly
unexpected, human.

The design **can be loud. It must not be chaotic.** One visual section normally
has one dominant color, one or two supporting colors, and appropriate neutral
space. Do not use every brand color at once.

**Scope split (resolves the old Notion-quiet vs. new editorial conflict):**

- **Landing page** → editorial chapters (see §12). Oversized type, unusual layouts, expressive color. Never a generic feature-card grid.
- **Product / app screens** (onboarding, profile, careers, roadmap, learning, proof) → quiet Notion-like base: white canvas, neutral borders, whitespace, with brand color as tints + actions. This is where the §3 neutrals and tint recipe apply most.

### Never do (generic AI-SaaS slop)

Generic "AI" visual language, purple AI gradients, gradient text, animated
gradients, excessive glassmorphism, excessive rounded cards / pills /
repetitive rounded containers, sparkle icons, fake AI magic effects, generic
dashboard mockups, stock illustrations, generic 3D objects, excessive shadows,
feature-card grids everywhere, unnecessary badges, decorative particles,
repeating "AI-powered" throughout the UI. No decoration because it is fashionable.

### Design quality test

Before considering a visual redesign complete, ask: *"Could this design belong
to 100 other AI startups?"* If yes, keep iterating. Identity must come from Oi
typography, expressive color, editorial composition, playful career typography,
whitespace, and the aspiration → uncertainty → exploration → start narrative —
recognizable even without the logo.

> Make it look like a product made for students that happens to use AI — not an
> AI product that happens to target students.

---

## 3. Color system

### 3.1 Neutrals (product base, ~85–90% of app screens)

| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page canvas (light) |
| `--foreground` | `0 0% 4%` | `#0A0A0A` | Primary text (light) |
| `--card` | `0 0% 100%` | `#FFFFFF` | Cards (separated by border, not fill) |
| `--card-foreground` | `0 0% 4%` | `#0A0A0A` | Card text |
| `--muted` | `60 11% 96%` | `#F7F7F5` | Subtle surfaces, hover rows, sidebars |
| `--muted-foreground` | `0 0% 42%` | `#6B6B6B` | Secondary text (5.3:1 on white) |
| `--border` / `--input` | `60 4% 91%` | `#E9E9E7` | Dividers, input borders |

### 3.2 Palette (merged — update wins)

The palette is fixed. Do not add, shift, or substitute colors. The older ban on
Taffy and Blue Vinyl is **rescinded** — they are supporting expressive colors.

| Token | Name | Hex | Role |
|---|---|---|---|
| `--lory-blue` | **Kind Berry** | `#1F6BED` | Light-mode primary accent. Buttons, links, focus rings, active states |
| `--lory-yellow` | **Mellow** | `#F4FF1E` | Light-mode highlight. Emphasis, markers, selected moments. Fill only, never text on white |
| `--lory-burgundy` | **Velvet Cherry** | `#6E1221` | Dark-mode primary accent. Accent surfaces, blocks, large areas, borders. Also the light-mode destructive value (role changes by theme — always use the semantic token) |
| `--lory-pink` | **Flossy** | `#FF7FAB` | Dark-mode highlight. Expressive typography, markers. Check contrast on the actual background |
| `--lory-green` | **Green House** | `#116B09` | Supporting expressive color: growth, learning, progress. Do NOT auto-map it to semantic success |
| `--lory-taffy` | **Taffy** | `#E76290` | Supporting: playful editorial moments, transitions, illustrations, special sections |
| `--lory-hot-pink` | **Hot Pink** (warm) | `#FF4283` | Supporting: energy, celebration, milestones. Default attention pink |
| `--lory-magenta` | **Hot Pink** (electric) | `#FF1EC7` | Rare: high-energy editorial / celebratory moments only |
| `--lory-vinyl` | **Blue Vinyl** | `#0759A2` | Supporting deeper blue. Depth alongside Kind Berry; never replaces it as the light interaction color |

**Hierarchy:** Kind Berry + Mellow lead light mode; Velvet Cherry + Flossy lead
dark mode. Example relationships (not rigid rules): White + Kind Berry + Mellow
(light); Black + Velvet Cherry + Flossy (dark / uncertainty); Green House +
Flossy/neutral (growth); Hot Pink/Taffy + Mellow (celebration); Blue Vinyl +
Kind Berry (depth). Never more than three palette colors in one screen region.

### 3.3 Semantic mapping (theme-aware — update wins)

Components must consume semantic tokens, never hardcode "primary = blue".

| Token | Light resolves to | Dark resolves to |
|---|---|---|
| `--accent-primary` | Kind Berry `#1F6BED` | Velvet Cherry `#6E1221` |
| `--accent-highlight` | Mellow `#F4FF1E` | Flossy `#FF7FAB` |
| `--surface` / `--background` | `#FFFFFF` | `#000000` or approved dark neutral |
| `--foreground` | `#0A0A0A` | light/white foreground for the background |

Keep `--primary`, `--secondary`, `--accent`, `--ring`, `--success`,
`--destructive` (+ foregrounds) as shadcn aliases wired to the tokens above.
Dark mode is NOT light mode with a black background — it is its own expression.

### 3.4 Pastel tint recipe (product screens)

Board colors are saturated: use translucent tints on surfaces, solid color for
small important elements.

| Use | Tint | Text on it |
|---|---|---|
| Info / selected surface | `bg-lory-blue/10` | `text-foreground` |
| Highlight / current step surface | `bg-lory-yellow/30` | `text-foreground` |
| Soft tag / early-progress surface | `bg-lory-pink/20` | `text-foreground` |
| Attention surface | `bg-lory-hot-pink/10` | `text-foreground` |
| Success surface | `bg-lory-green/10` | `text-lory-green` + icon/label (never color alone) |
| Error surface | `bg-lory-burgundy/10` | `text-lory-burgundy` + icon/label |

Tailwind alpha modifiers only work if colors are registered as
`hsl(var(--token) / <alpha-value>)` in `tailwind.config.ts`.

### 3.5 Contrast rules

| Pair | Ratio | Rule |
|---|---|---|
| White on Kind Berry | 4.8:1 | OK for buttons and body-size text |
| Kind Berry on white | 4.8:1 | OK for links. On `--muted` drops to ~4.5:1 — use bold/larger there |
| Foreground on Mellow | ~18:1 | The only correct text on Mellow |
| Mellow on white | 1.1:1 | **Never** as text, icon, or border on white |
| Foreground on Flossy | ~9:1 | OK |
| White on Flossy | 2.4:1 | **Never** |
| White on either Hot Pink | ~3.3:1 | Large/bold only. Never pink text on white |
| White on Green House / Velvet Cherry | 6.7:1 / 11.9:1 | OK |
| Velvet Cherry as text on black | poor | Use as surface/block/border, not body text on dark |
| Foreground on Kind Berry | 4.1:1 | Do not use. Pair Kind Berry with white |

Always evaluate the actual foreground/background pair. Text: 4.5:1 normal, 3:1
large (18px+ or 14px+ bold). **Color alone must not communicate meaning** — pair
with text or icon (especially skill levels, success/error).

### 3.6 Color rules

- **Never** raw Tailwind colors (`bg-blue-500`) or raw hex in components. Use semantic tokens (`bg-primary`, `text-lory-blue`) or add a `cva` variant.
- Status colors go through semantic tokens or badge variants.
- Gradients: static brand-pair only (Kind Berry → Flossy, Flossy → Hot Pink), hero/celebratory sparingly. No purple AI gradients, no gradient text, no animated gradients.
- Lory's orange-red belongs to the illustration, not the UI. Do not recolor UI to match it.

---

## 4. Typography (update wins: Oi replaces Knewave)

| Role | Font | CSS variable | Class |
|---|---|---|---|
| Display / headlines | **Oi** (expressive, editorial) | `--font-display` | `font-display` |
| Body / UI text | **Space Grotesk** | `--font-body` | `font-body` (default on `<body>`) |
| Data / mono | **IBM Plex Mono** | `--font-mono` | `font-mono` |

### Rules

- Hero headlines, major section headings, large editorial statements: `font-display`. **Oi has a single weight.** Use `font-normal`, never `font-bold`/`font-semibold`.
- Body, nav, labels, paragraphs, buttons: `font-body`.
- Technical info, metadata, scores, tabular values: `font-mono`.
- **Never** Oi for nav, buttons, labels, dense UI, body copy, or text under ~18px.
- **Never** all-caps labels as a default; oversized expressive words (e.g. DOCTOR, PILOT, DESIGNER) are intentional editorial moments, not labels.
- Highlighting a word with color/marker is allowed as a brand moment (e.g. Mellow marker behind a hero word), but must stay readable and intentional.
- Line length: max ~80 chars for body (`max-w-md` hero copy, `max-w-2xl` section intros).
- Do not reduce every design problem to cards. Prefer oversized text, typographic composition, editorial hierarchy, scale changes, controlled rotation, unusual alignment — where readable.

### Type scale (starting point, compose editorially on landing)

| Element | Class |
|---|---|
| Hero H1 | `font-display font-normal text-5xl md:text-7xl` (landing may go larger) |
| Section H2 | `font-display font-normal text-3xl md:text-4xl` |
| Card H3 (product) | `font-display font-normal text-lg` |
| Body | `text-base` / `text-lg`, `text-foreground` or `text-muted-foreground` |
| Small / meta | `text-sm` / `text-xs`, `text-muted-foreground` (+ `font-mono` for data) |

Migration note: `layout.tsx` still loads Knewave — swap to Oi (`next/font/google`, single weight, `--font-display`) as part of the landing rework.

---

## 5. Voice and copy

Two voices. Do not mix them.

**UI voice** (buttons, labels, errors, empty states, settings): plain verbs,
sentence case, active voice, no filler. "Start my journey", "Skip for now",
"Upload resume". Avoid startup clichés ("Unlock your potential", "Revolutionize
your journey", "cutting-edge AI", "powered by magic").

**Lory voice** (chat bubbles, tooltips, reactions, empty-state companion lines):
cheerful and whimsical study-buddy, occasional humor. Never childish, never a
decision-maker. "Nice! That tells me a little more about you." / "Okay, we found
a skill gap. No panic, that's literally what we're here for."

Rules:
- Lory may explain, encourage, and ask. Lory never says "you should be a ___".
- Use *alignment*, not *match*. Show a reason next to every alignment percentage.
- Lory says there are no wrong answers; "Skip" and "I'm not sure yet" are always available in the interview.
- Label AI-generated content ("Lory suggests", "AI-generated").
- Frame AI as: "AI helps you explore. You make the decisions. You do the learning. You demonstrate the skill." Never the protagonist.
- Resume optional, skippable questions, student in control. Never claim privacy/data guarantees that are not implemented.
- Never fabricate functionality for marketing UI (no fake match %, scores, roadmaps, analytics). Inspect the implementation; use real components/data.

---

## 6. Spacing and layout

- **Product container**: `mx-auto max-w-5xl px-6`. Landing chapters may break out intentionally (full-bleed color blocks, oversized type) but must not cause horizontal overflow.
- **Section vertical padding**: `py-16 md:py-20`; hero: `py-24 md:py-32` (product). Landing chapters set their own rhythm.
- **Separators**: `border-b border-border` on product screens. Landing uses color-block / whitespace transitions between chapters instead.
- **Cards (product only)**: `rounded-xl border border-border bg-card`. Hover may add a faint tinted ring, never a dark shadow. Landing: do NOT default to cards.
- **Grid gaps**: `gap-4` for cards, `gap-px bg-border` for dense grids (product).
- **Use `gap-*` over `space-x-*` / `space-y-*`. Use `size-*` over `w-* h-*`** when equal.
- Mobile-first. Design at 375px first; validate 375 / 768 / 1280. Mobile recomposes, never just shrinks. Touch targets ≥ 44×44 (`size-11`).

---

## 7. Components

### 7.1 Existing shadcn/ui (extended)

| File | Key additions |
|---|---|
| `components/ui/button.tsx` | `loryBlue` (primary) and `loryYellow` (highlight, dark text) variants via `cva` |
| `components/ui/card.tsx` | `rounded-xl`, border, tinted hover ring |
| `components/ui/input.tsx` | `focus-visible:ring-lory-blue` |

Follow the `shadcn` skill: existing components first, compose don't reinvent,
variants before custom styles, `FieldGroup`+`Field` for forms, `Badge`/`Alert`/
`Empty`/`Skeleton`/`Separator` over custom divs, `data-icon` for button icons,
no `dark:` overrides (semantic tokens instead).

### 7.2 Custom components

| File | Purpose | Key props |
|---|---|---|
| `components/lory-avatar.tsx` | Animated mascot | `state`: `idle \| thinking \| happy \| confused`; `size`: `sm \| md \| lg`; `animate` |
| `components/progress-bar.tsx` | Progress fill | `value`, `max`, `variant`: `default \| gel \| gradient`, `label` |
| `components/skill-badge.tsx` | Skill proficiency badge | `skill`, `level`: `not-assessed \| started \| developing \| demonstrated \| strong` |
| `components/career-card.tsx` | Career exploration card | `title`, `alignmentPercent`, `reason`, `isSaved`, `onSave`, `onClick` |
| `components/chat-message.tsx` | Interview and help chat bubble | `sender`: `lory \| user`, `message`, `isTyping`, `timestamp`, `options?` |
| `components/roadmap-step.tsx` | Learning level | `level`, `title`, `activities`, `proof`, `isCompleted`, `isCurrent` |
| `components/mascot-reaction.tsx` | Floating mascot + message | `state`, `message`, `showBadge` |

### 7.3 Components to add (from the MVP screen list)

| File | Purpose |
|---|---|
| `components/student-profile.tsx` | Readable profile: program, year, interests, strengths, developing, unassessed. No opaque AI score |
| `components/skill-gap-map.tsx` | Career skills vs the student's status (skill, level badge, short note) |
| `components/resume-upload.tsx` | Optional upload with consent copy and a "Skip for now" button of equal prominence |
| `components/lost-button.tsx` | "I'm Lost" entry point to exploratory questions |
| `components/lory-help-chat.tsx` | Persistent help chat grounded in the student's profile and roadmap |
| `components/learning-activity.tsx` | One-concept micro-learning card: learn one thing, try one example, do one challenge |
| `components/proof-challenge.tsx` | Skill challenge / project submission that updates demonstrated skills |
| `components/ai-disclosure.tsx` | "Why we ask" and "AI-generated" labels |
| `components/language-toggle.tsx` | English / Filipino switch |

`streak-counter.tsx` exists but is **not in context.md or the MVP screen list**. Do not surface it in the demo unless the user asks for it.

### 7.4 Skill level styling

Color is never the only signal. Every level shows its text label.

| Level | Surface | Text |
|---|---|---|
| `not-assessed` | `bg-muted`, dashed border | `text-muted-foreground` |
| `started` | `bg-lory-pink/20` | `text-foreground` |
| `developing` | `bg-lory-yellow/30` | `text-foreground` |
| `demonstrated` | `bg-lory-blue/10` | `text-lory-blue` |
| `strong` | `bg-primary` | `text-primary-foreground` |

### 7.5 Usage rules

1. Use **built-in variants first**, then `className` for layout only, then add a `cva` variant.
2. **Never** override colors via `className`. Use semantic tokens or add a variant.
3. Use `cn()` for conditional classes.
4. Do **not** add manual `z-50` on overlay components (Dialog, Sheet, etc.).
5. Use the `shimmer` utility for loading states, not custom `@keyframes`.
6. No `space-x-*` / `space-y-*`. Use `gap-*`. Prefer `truncate` shorthand.
7. Landing rule: do not turn information hierarchy (§12) or the product loop into identical-card grids. Use editorial composition and visual continuity.
8. Scope discipline: a landing task must NOT silently redesign dashboard/auth/profile/roadmap/backend. Shared-component changes must be backwards-compatible, intentional, documented, and regression-safe. Prefer variants and semantic tokens.

---

## 8. Animation system (update wins: restrained, no constant float)

### Approach

| Layer | Tool | Used for |
|---|---|---|
| Simple states | **CSS / Tailwind** | Hover, focus, `transition-colors` |
| Complex motion | **Framer Motion** | Typography entrances, career-word placement, chapter transitions, stagger |

Follow the `ui-taste` skill workflows (`new-work` for landing chapters,
`operate` for product/dashboard, `polish`/`distill` for refinement) and the
`emil-design-eng` restraint on springs and stagger.

### Motion vocabulary

| Effect | Where | Implementation |
|---|---|---|
| **Subtle type entrance** | Hero, chapter headings | Opacity/translate once, then rest |
| **Career words into position** | Hero expressive typography | Staggered settle, not looping |
| **Highlight marker appear** | Mellow/Flossy emphasis | Scale/opacity pop, once |
| **Stagger** | Section entrances (sparingly) | `staggerChildren: 0.15` |
| **Spring** | Badge pop, avatar bounce | `type: "spring", damping: 10-20` |
| **Press feedback** | Buttons, cards | `whileTap={{ scale: 0.98 }}` |
| **Layer jump** | Sign-up / interview steps | Outgoing fades+shrinks, next springs up (transform + opacity) |
| **Shimmer** | Loading | `.shimmer` utility |
| **Progress fill** | Progress bar | Animate `scaleX`, `transform-origin: left` (never `width`) |
| **Scroll reveal** | Sections | `whileInView` (sparingly) |

Retired as defaults: infinite `lory-float` (4s) and `gel-wiggle` (6s). Keep the
keyframes in config only if a specific intentional moment needs them — never as
ambient always-on motion.

### Motion rules

- **Purposeful only**: orient, give feedback, or show relationships.
- **One orchestrated moment per page** (hero/chapter entrance). Step transitions count as navigation feedback, not decoration.
- **Never**: constant floating, particles, excessive parallax, animated gradients, AI sparkle effects, everything moving at once.
- **Reduced motion**: honor `prefers-reduced-motion` (instant or opacity-only).
- **No blocking**: content usable without animation.
- **Animate `transform` and `opacity` only.** Shorter for frequently-seen elements.

---

## 9. Vercel React best practices

| Rule | Applied in |
|---|---|
| `bundle-barrel-imports`: import directly, avoid barrel files | All components |
| `rendering-hoist-static-jsx`: static JSX outside components | Career and loop data as module-level consts |
| `rerender-no-inline-components` | All components at module level |
| `rendering-conditional-render`: ternary, not `&&` | Conditional rendering |
| `server-hoist-static-io` | Fonts in `layout.tsx` via `next/font` |
| `rerender-functional-setstate` | State updates use functional form |
| Animate wrapper div, not SVG | LoryAvatar wraps SVG in `motion.div` |

- Components using hooks or stateful animation need `"use client"`.
- Prefer CSS transitions for simple hover and focus.
- Use `whileInView` instead of scroll listeners.

---

## 10. Accessibility

- Semantic HTML: one meaningful H1, logical heading hierarchy, keyboard-navigable, visible focus (`focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2` — theme-aware).
- Touch targets ≥ 44×44 (`size-11`).
- Contrast: see §3.5. Re-check any new pairing, especially Flossy/Hot Pink/Mellow as text and all dark-mode pairs.
- Color never alone for meaning. Decorative oversized typography must not obscure content or replace readable headings.
- All interactive elements reachable via Tab, with visible focus.
- `prefers-reduced-motion` respected. Animations use transform/opacity.
- Chat and AI output regions use `aria-live="polite"`.
- No Oi in small or dense text (hackathon a11y bonus).

---

## 11. File conventions

```
components/
├── ui/                    # shadcn primitives (button, card, input, label)
├── lory-avatar.tsx        # custom components: kebab-case, one per file
├── ...
lib/
├── utils.ts               # cn() utility
app/
├── globals.css            # ALL CSS variables go here, never a new CSS file
├── layout.tsx             # fonts loaded via next/font/google (Oi + Space Grotesk + IBM Plex Mono)
tailwind.config.ts         # colors (hsl(var(--x) / <alpha-value>)), keyframes, animations
```

- **One component per file**, named export (not default).
- `React.forwardRef` for DOM-targeting components, with `displayName` set.
- `cva` for variant-driven styling.
- Props interfaces exported alongside components: `export interface XProps`.

---

## 12. Landing page direction (update wins)

Central question: **"What do you want to be?"** Supporting idea: **"You don't
have to know yet."** Narrative: ASPIRATION → UNCERTAINTY → EXPLORATION → START.

Possible chapters: **POSSIBILITY** (bright, Kind Berry + Mellow) → **UNCERTAINTY**
("You don't have to know yet", darker Velvet Cherry + Flossy chapter) →
**EXPLORATION** ("Let's figure out what's possible", open) → **LEARNING**
("Know it. Try it. Prove it.", supporting palette) → **START** ("You don't need
the whole answer. You just need somewhere to start.", clear action).

Rules:
- Possible career words (DOCTOR, PILOT, DESIGNER…) are expressive typography about possibility — NOT cards or matches unless the interaction requires it.
- Answer, in order: what is Ka-Lakbay, who is it for, what problem, how it works, what AI actually does, what the student gets, what next. Editorial composition, not a feature grid.
- Product loop (Discover → … → Reassess) as one connected journey with visual continuity, not identical cards.
- Communicate the real educational problem (interests↔career gap, skills gap, what-next overload) without exaggeration.

---

## 13. Design contract (for new screens)

Before building a new screen, confirm:

1. **Purpose**: persuade / operate / read / experience. Does it support the core loop? If not, don't build it.
2. **First viewport**: communicates the task immediately with one obvious next action.
3. **Color**: landing = intentional editorial pairing (§3.2); product = white/neutral base, semantic accent actions, highlight sparingly.
4. **Type**: Oi (single weight) for display, Space Grotesk for body, IBM Plex Mono for data.
5. **Copy**: UI voice for controls, Lory voice for companion text. "Alignment", not "match". No invented functionality.
6. **Privacy and AI**: say why data is collected, label AI content, keep resume optional.
7. **Motion**: one orchestrated entrance, restrained feedback, reduced motion respected.
8. **States**: loading, empty, error, disabled, success, all implemented.
9. **Responsive**: tested at 375px, 768px, 1280px.

**MVP screens** (from context.md): landing, login/sign-up, AI introduction, AI interview, optional resume upload, student profile, career cards, career detail, skill-gap view, personalized roadmap, micro-learning activity, skill challenge / proof, updated progress.

**Verify**: run `npm run typecheck && npm run lint`, then check at 375px and 1280px.

---

## 14. Skills to use (from skill search)

| Task | Skill | Install |
|---|---|---|
| Landing composition, anti-slop layout | `uizze.sh@ui-taste` (already vendored under `.agents/skills/`) | load via skill tool; workflows `new-work` / `polish` / `distill` |
| Next.js structure, restraint | `vercel-labs/agent-skills@web-design-guidelines` (688K installs) | `npx skills add vercel-labs/agent-skills@web-design-guidelines` |
| Taste critique gate | `anthropics/skills@frontend-design` (941K) + `pbakaus/impeccable@impeccable` (304K) | `npx skills add anthropics/skills@frontend-design` / `npx skills add pbakaus/impeccable@impeccable` |
| Restrained motion craft | `emilkowalski/skills@emil-design-eng` (312K) | `npx skills add emilkowalski/skills@emil-design-eng` |
| shadcn composition rules | `shadcn` (already vendored) | load via skill tool |

Skipped low-trust lookalikes (`anti-ui-slop` 13 installs, `anti-slop-review` 4 installs). Prefer the high-install, reputable sources above; this file outranks any skill on brand conflicts (palette, Oi, copy).

---

## 15. Commands

```bash
npm run dev         # dev server at localhost:3000
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

Run `typecheck` and `lint` before considering any UI task complete.
