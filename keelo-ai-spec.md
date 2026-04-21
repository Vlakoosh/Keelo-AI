# Keelo AI — Product & Technical Specification

## 1. Product vision

Keelo AI is a **local-first fitness tracking app** that combines:

- calorie and macro tracking
- custom foods and recipes
- workout logging and routines
- progress tracking, PRs, medals, and streaks
- optional AI assistance
- optional cloud sync and backup

The core product should be **fully useful without an account, without payment, and without internet**. Premium should unlock **extra convenience** and features that actually cost money to provide, such as AI, cloud sync, photo storage, and richer cloud-powered features.

The goal is not to build a manipulative “fitness funnel.” The goal is to build an app that gives strong value immediately, respects the user, works offline, and becomes more useful over time.

---

## 2. Core product philosophy

### 2.1 Local-first by default

The app should work immediately after install, with no sign-in required.

Core functionality should run entirely on-device:

- workouts
- foods
- recipes
- daily logs
- goals
- streaks
- medals
- history
- dashboards

Benefits:

- instant use
- zero-friction onboarding
- near-zero infrastructure cost for free users
- strong UX in the gym or kitchen
- a strong privacy story

### 2.2 Cloud is optional

Cloud features should be a second layer on top of the local core, not a dependency.

Cloud should exist for:

- backup
- sync
- multi-device use
- AI features
- photo storage
- future social/community features

### 2.3 Free should be genuinely good

The free app should never feel broken, crippled, or intentionally frustrating. The user should be able to use the app long-term without paying and still get a complete, useful experience.

Premium should mean:

- convenience
- smart extras
- infrastructure-heavy features
- richer automation

### 2.4 AI should assist, not replace normal UX

The app should still be button-first and structured. Logging food or sets should never require chat. The AI tab is for:

- analysis
- recommendations
- transformations
- plan creation
- smart actions

### 2.5 Discovery can be online, usage must survive offline

This rule should apply everywhere.

Examples:

- food search can be online
- once a food is used, it must be cached locally
- old logs must still work offline
- recipes must still work offline
- workouts must still work offline

That is how the app avoids feeling fragile.

---

## 3. Platform targets

### 3.1 Primary target

- **Android first**

Reason:

- this is the main development and personal testing platform
- easiest way to iterate fast and dogfood the app daily

### 3.2 Secondary target

- **iOS**

Reason:

- React Native + Expo makes cross-platform support realistic
- once the app is stable on Android, iOS can be added without a full rewrite

---

## 4. Technical stack

### 4.1 Mobile app

- **React Native**
- **Expo**
- **TypeScript**
- **Expo Router**
- **NativeWind / Tailwind-style workflow for React Native UI**
- **SQLite** for local storage/database

Rationale:

- React Native + Expo gives fast iteration, one codebase, Android-first development, and relatively easy iOS support later.
- TypeScript improves maintainability and safety.
- Expo Router keeps navigation predictable and scalable.
- NativeWind gives a Tailwind-like DX while still fitting React Native.
- SQLite provides proper offline data modeling for workouts, food, recipes, logs, goals, and sync metadata.

### 4.2 Frontend styling

- **TailwindCSS-style utility workflow** via NativeWind
- design tokens for spacing, colors, radii, borders, typography
- strong consistency from the start

Rationale:

- fast UI building
- consistent styling system
- easy theming
- easy enforcement of the black/white minimal design philosophy

### 4.3 Local database

- **SQLite on device**

Rationale:

- reliable offline support
- much better than trying to approximate this with key-value storage
- supports clean relational models for workouts, sets, foods, recipes, logs, goals, and sync queue metadata

### 4.4 Cloud backend

- **Supabase**
  - Auth
  - Postgres
  - Storage later if needed
- **JavaScript / TypeScript backend** for AI and complex logic, hosted on **Vercel**

Rationale:

- Supabase is a strong fit for auth + cloud DB + future storage
- Vercel is easy for small backend/API endpoints
- Custom backend should exist only for things the mobile app should not do itself:
  - AI calls
  - OCR parsing
  - barcode/food enrichment
  - remote sync helpers if needed
  - future external integrations

### 4.5 AI models

- cheaper, efficient models for the free/lite AI tier
- stronger models only where truly needed

Rationale:

- keeps cost controlled
- allows the AI to feel useful without turning the app into an expensive feature sink

---

## 5. Architecture model

### 5.1 Layer 1: local core

Lives on the device. Works offline. No account needed.

Contains:

- exercises
- workout templates
- workout sessions
- sets
- foods
- recipes
- recipe ingredients
- daily food logs
- goals
- bodyweight entries
- medals/streaks
- dashboard cache
- local AI context summaries
- locally cached online foods

### 5.2 Layer 2: cloud extras

Only enabled if the user wants them.

Contains:

- account/auth
- sync/backup
- multi-device
- AI requests
- storage for progress pictures
- cloud food enrichment
- future shared/community content

This split should be visible in the product itself:

- local mode is normal mode
- cloud mode is optional power mode

---

## 6. Sync functionality

Keelo AI should be designed as **offline-first**, not “online-first with an offline fallback.”

### 6.1 Core sync model

Every user action should:

1. write to the local SQLite DB immediately
2. mark the change as pending sync if the item is cloud-syncable
3. update the UI instantly
4. sync later in the background if the user has cloud enabled and internet is available

This means:

- logging a set never waits for the backend
- adding a meal never depends on the network
- the app always feels responsive

### 6.2 Data model requirements for syncable entities

Each syncable table should include fields like:

- `id` (UUID)
- `user_id` nullable until account link
- `created_at`
- `updated_at`
- `deleted_at` nullable for soft delete
- `sync_status` (`pending`, `synced`, `failed`)
- optional `version`

### 6.3 Sync queue

Use a local sync queue table for operations like:

- create
- update
- delete

When the device is online and the user is signed in:

- the queue flushes
- the remote DB upserts the records
- local rows get marked synced

### 6.4 Conflict handling

Use **simple conflict handling** early:

- last-write-wins for most editable objects
- append-heavy logs are naturally easier because new rows rarely conflict

This is enough for:

- foods
- recipes
- workouts
- goals
- logs

### 6.5 Soft deletes

Use `deleted_at` instead of hard delete so deleted items do not resurrect after sync.

### 6.6 Account adoption flow

A user should be able to use the app for weeks locally, then create an account later and choose to back up existing local data.

That means local data must be designed to become cloud-linked later without breaking anything.

---

## 7. Food and nutrition system

This is one of the biggest pillars of the app.

### 7.1 Core food features

- calorie and macro tracking
- daily targets
- custom foods
- custom meals and recipes
- meal prep workflows
- recent foods
- favorites
- reusable entries
- bodyweight-goal-based calorie suggestions

### 7.2 Food data sources

There should be multiple food sources:

- built-in staples dataset
- global online food catalog
- user-created custom foods
- scanned foods from nutrition labels
- user-submitted foods later if desired

### 7.3 Offline food behavior

If a user interacts with a food from the online catalog, that food must be cached locally so it still works offline later.

Examples of “interacts with”:

- logs it
- adds it to favorites
- adds it to a recipe
- opens full details
- scans it and confirms it

### 7.4 Food snapshots

Historical logs should store nutrition snapshots so past logs do not change if the central food DB changes later.

Recipes should also be robust:

- either reference a guaranteed local copy
- or store enough nutrition info to remain valid offline

### 7.5 Barcode support

Each food should support barcode metadata if available.

Possible flows:

- barcode scan -> find existing food
- barcode scan -> create new food if not found
- nutrition label scan -> parse nutrition info
- optional second step barcode scan to attach product barcode
- or barcode first, label second
- or a combined guided flow

Barcode should become part of the reusable food metadata when available.

### 7.6 Nutrition-label scan

This is a standout premium convenience feature.

Flow:

1. user taps “scan nutrition label”
2. camera opens
3. app captures label
4. backend OCR/parser extracts fields
5. user reviews editable values
6. optionally scans barcode too
7. saves as new custom food

Important fields:

- product name
- calories
- protein
- carbs
- sugars
- fats
- saturated fats
- fiber
- salt
- serving size
- per 100g/ml values
- package size if useful
- barcode if available

The point is not perfect magic. The point is drastically reducing manual entry.

### 7.7 Recipe UX

The recipe system should be built around meal prep.

Users should be able to:

- add ingredients with quantities
- see total recipe macros
- split recipe by servings
- log per serving
- log half or 1.5 servings
- optionally define final cooked weight and log by grams

This gives both:

- “6 servings”
- “I ate 420g of this”

That is much better than forcing every meal into fake equal portions.

### 7.8 Goal calculations

Support:

- weight
- height
- age
- activity level
- current goal
- target weight
- suggested maintenance calories
- suggested deficit/surplus
- manual override

The app should help calculate targets, but always allow manual entry.

---

## 8. Workout system

The workout side should be just as polished as the nutrition side.

### 8.1 Core workout features

- exercise library
- custom exercises
- routines/templates
- start workout from routine
- add exercises during workout
- add sets with reps and weight
- exercise notes if needed later
- workout history
- exercise history
- PR tracking
- medals/trophies
- streaks

### 8.2 Key killer UX feature: previous performance memory

When an exercise is added to a workout, the app should show:

- previous workout values
- best weight
- best volume
- estimated PR if useful
- recent performance history

This is one of the biggest stickiness features because it reduces friction during workouts and supports progressive overload.

### 8.3 Workout routine UX

Users should be able to:

- build reusable routines
- start them with one tap
- reorder exercises
- duplicate routines

Routines should behave like cookie cutters:

- starting a routine copies its exercises, set structure, targets, and rest preferences into a fresh workout
- the fresh workout can be edited freely without changing the original routine
- active workout changes should not prompt the user to update or save over the source routine

### 8.4 Session logging UX

Must be fast and mechanical:

- large tap targets
- minimal taps
- easy edit/delete
- obvious completion flow
- checking a set with previous values should autofill the weight/reps from the previous-value placeholders before saving
- adding a new set should preserve useful context from the existing set pattern for that exercise
- no lag
- one-handed friendly

Per-exercise notes are enough for workout logging. Per-set notes are intentionally out of scope unless a clear need appears later.

### 8.5 PRs, medals, and streaks

The app should award set trophies for three best-set categories:

- highest weight for that exercise
- highest set volume for that exercise
- highest estimated PR for that exercise

The app can separately track broader motivation signals like:

- streaks
- milestone workout counts

This adds motivation without becoming visually noisy or childish.

---

## 9. Progress and analytics

### 9.1 Free analytics

- bodyweight trend
- calorie average
- protein average
- workout count
- recent PRs
- consistency streaks
- progress summaries

### 9.2 Premium analytics

- richer trend dashboards
- longer-period comparisons
- volume progression per exercise
- calorie adherence trends vs weight change
- nutrition consistency breakdowns
- richer progress insights later

---

## 10. AI assistant

The AI assistant is a side feature, not the main interface.

It exists because manually taking logs, recipes, and workouts to ChatGPT for feedback is annoying and should happen inside the app instead.

### 10.1 AI use cases

#### Analysis

- “How has my protein been this week?”
- “Am I progressing on incline dumbbell press?”
- “Which days am I missing workouts?”
- “Have I been eating enough for my goal?”

#### Recommendations

- “Make this recipe leaner but keep protein high”
- “Adjust my calories for a slower cut”
- “Suggest substitutions for this ingredient”
- “Build me a 4-day hypertrophy split”

#### Actions

- create a workout plan draft
- duplicate and edit recipe
- adjust goal targets
- suggest exercise replacements
- build shopping list from recipes later

### 10.2 AI architecture

The backend AI does not need permanent access to all user data.

Instead, the app should:

1. gather relevant local context from SQLite
2. build a compact request payload
3. send it to the backend
4. backend optionally uses remote tools if needed
5. return the answer or a draft action

This allows AI to work even for local-only users, because the app can pass relevant local data at request time.

### 10.3 Lite AI vs premium AI

A strong model is:

#### Lite AI

- available to free users
- smaller daily limit
- cheaper model
- focuses on local-context analysis
- no heavy web research
- no deep agent loops
- maybe no persistent cloud memory

#### Premium AI

- higher limits
- richer tool use
- web/external enrichment
- recipe/workout creation actions
- deeper analysis
- stronger models where needed

### 10.4 Agent/tool approach

The AI should call constrained tools, not freestyle directly into the DB.

Examples:

- get recent workouts
- get protein adherence
- get goal summary
- get recipe
- create workout draft
- duplicate recipe and modify ingredients
- search food DB
- search exercise knowledge

Actions should usually return as drafts that the user confirms.

---

## 11. UI design philosophy

The visual design should be minimal, serious, and extremely usable.

### 11.1 Visual direction

- black background
- white text
- gray structure/dividers
- no full-white cards/tiles
- optional outlined sections or subtle lines
- accent colors only where meaning matters

### 11.2 Color usage

Color should communicate important information only:

- protein
- carbs
- fats
- calorie progress
- medals
- streaks
- warnings/errors
- premium markers

No rainbow UI soup. Color means something.

### 11.3 Tiles and surfaces

- dark surfaces only
- optionally subtle borders/lines
- no loud full-white blocks
- no bloated decorative components
- clean hierarchy through spacing and typography

### 11.4 Typography and layout

- strong hierarchy
- high readability
- large tap targets
- simple icons
- consistent spacing system
- no overcomplicated decorative elements

### 11.5 Premium indication

Premium features should show:

- a small premium icon/badge next to the feature
- on activation, a clear pricing popup
- concise explanation of what unlocks
- no manipulative traps

This fits the product philosophy much better than hiding everything behind vague gray buttons.

---

## 12. Navigation / tab structure

Recommended tab setup:

- **Today**
- **Food**
- **Workout**
- **Progress**
- **AI**

### 12.1 Today

Dashboard:

- calories today
- protein today
- workout status
- streak
- quick actions
- recent medals/PRs

### 12.2 Food

- daily food log
- quick add
- recent foods
- favorites
- recipes
- custom foods
- scanner entry points

### 12.3 Workout

- routines/templates
- start workout
- exercise library
- workout history
- current session

### 12.4 Progress

- bodyweight
- charts
- PRs
- streaks
- consistency
- analytics

### 12.5 AI

- ask questions
- get feedback
- create plans
- recipe adjustments
- premium AI actions

---

## 13. Pricing tiers

### 13.1 Free tier

The free tier should include the whole local core.

#### Free features

- no-account usage
- offline use
- workout logging
- routines/templates
- previous set memory
- custom exercises
- food logging
- custom foods
- recipes and meal prep
- goal calculation + manual targets
- bodyweight tracking
- local medals/streaks
- local progress history
- local dashboard
- local cache of used foods
- lite AI quota (optional)

This should already be a good product.

### 13.2 Paid tier

Premium should cover cloud convenience and infra-heavy features.

#### Paid features

- cloud backup
- device sync
- multi-device support
- progress pictures
- AI nutrition label scan
- richer barcode/scan workflows
- full AI assistant limits
- advanced analytics
- cloud-powered extras later
- shared/community content later if desired

This keeps the monetization honest: users pay for the things that cost money or add major convenience.

---

## 14. Milestones

### Milestone 0 — foundation

Goal: build the skeleton correctly.

Includes:

- project setup
- design tokens
- NativeWind/Tailwind styling system
- SQLite schema
- navigation/tabs
- local data layer
- reusable UI primitives
- theme foundation
- premium badge component
- feature gating system

### Milestone 1 — workout MVP

Goal: make the app already useful as a workout tracker.

Includes:

- exercise library
- custom exercises
- routines/templates
- workout sessions
- sets with reps/weight
- previous values memory
- session history
- basic PR medals
- streaks
- polished logging UX

This is the first major value milestone.

### Milestone 2 — nutrition MVP

Goal: make it useful as a calorie/macro app too.

Includes:

- foods
- favorites/recent foods
- custom foods
- daily logs
- goals
- calorie/macro dashboard
- recipes
- servings
- cooked-weight option
- bodyweight entries

At this point the app becomes the combined tracker.

### Milestone 3 — local polish and retention

Goal: make it better than using two separate apps.

Includes:

- dashboard refinement
- better search/filtering
- medals polish
- better history views
- quick-add flows
- recipe reuse flows
- copy-from-yesterday helpers
- built-in staple foods pack
- local caching improvements

### Milestone 4 — cloud layer

Goal: add optional account + sync without disturbing local users.

Includes:

- Supabase auth
- account creation optional
- account adoption flow for existing local users
- sync queue
- remote Postgres sync
- backup/restore
- multi-device support
- premium gating for sync

### Milestone 5 — scanning features

Goal: major convenience upgrade.

Includes:

- barcode scanning
- online food lookup
- local caching of found foods
- nutrition label scan
- review/edit screen
- barcode + label linking flow
- premium gating for scan-heavy features if desired

### Milestone 6 — AI lite

Goal: useful AI without massive cost.

Includes:

- ask about current logs/workouts
- simple summaries
- progress feedback
- recipe improvement suggestions
- workout feedback
- request-time local context bundling

### Milestone 7 — AI premium / agentic layer

Goal: real assistant behavior.

Includes:

- draft workout plan creation
- recipe duplication and transformation
- target adjustment recommendations
- external knowledge enrichment
- more tools
- structured action confirmation flows

### Milestone 8 — premium polish / growth

Goal: improve retention and monetization.

Includes:

- progress pictures
- advanced analytics
- premium settings
- subscription UX
- referral/community ideas later if useful

---

## 15. Payments and subscriptions

### 15.1 Practical strategy

For mobile app monetization, the simplest early strategy is likely:

- Google Play Billing on Android
- Apple In-App Purchase on iOS

This keeps payment handling aligned with the distribution platforms and avoids adding unnecessary billing complexity too early.

### 15.2 Why this approach makes sense

- simpler compliance path
- easier subscriptions flow inside stores
- more realistic for a solo developer
- easier to start with than building a separate external billing stack

### 15.3 Important note

Platform payment rules can change and should be re-checked before launch.

For now, the design goal is:

- premium icon next to paid features
- tap opens a pricing sheet / modal
- clear explanation of what unlocks
- no manipulative copy

---

## 16. Why this concept is strong

Keelo AI is compelling because it is not just “another fitness app.” It has a coherent identity:

- local-first
- offline-first
- no-account required
- real free value
- premium for convenience, not sabotage
- minimal black/white design
- workouts + nutrition in one place
- AI as an intelligent helper, not a gimmick

That combination is what makes it memorable.

---

## 17. Final one-sentence product definition

**Keelo AI is a local-first fitness tracker that combines workouts and nutrition, works offline with no account, and offers optional cloud sync plus an AI assistant for extra convenience.**

---

## 18. Suggested repository / project structure

Example naming:

- `keelo-ai-mobile`
- `keelo-ai-api`
- `keelo-ai-shared`

Or as a monorepo:

- `apps/mobile`
- `apps/api`
- `packages/shared`

---

## 19. Future implementation follow-up

Natural next documents after this spec:

1. database schema
2. screen list / navigation map
3. component design system
4. sync engine rules
5. AI tool contract design
6. milestone-by-milestone engineering roadmap
