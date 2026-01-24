# Task Timer App

## Overview
The Task Timer App is a Hebrew-language task management and timer application built with React. Its primary purpose is to help users manage daily tasks through time-based scheduling. Key capabilities include a circular progress timer, day/month calendar views, task completion tracking, and management of unscheduled standby tasks. The project aims to provide an ADHD-focused task management solution, simplifying interaction and promoting mental focus.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Build Tool**: Vite with SWC.
- **Routing**: React Router DOM.
- **State Management**: Zustand with local storage persistence.
- **Styling**: Tailwind CSS with CSS variables.
- **UI Components**: shadcn/ui built on Radix UI.
- **Animations**: Framer Motion.

### Data Model
Tasks progress through a lifecycle: pending → in_progress → completed/not_completed → archived. Key entities include `Task`, `StandbyTask`, `TaskTemplate`, `TemplateCategory`, `HistoryEntry`, and `Tag`.

### Key Features
- **Task Template System ("המתנה")**: Pre-configured task blueprints for quick scheduling, with usage tracking and categorization.
- **HaMekolel Smart Parser (המכולל)**: Natural language Hebrew text parser to convert freeform text into scheduled tasks, automatically detecting dates and times. It handles AM/PM ambiguity and supports various Hebrew time expressions.
- **Voice Input (קלט קולי)**: Utilizes Web Speech API for Hebrew speech recognition, integrating with HaMekolel for automatic date/time extraction and conflict detection.
- **Conflict Detection**: Automatically identifies and visually warns users about overlapping tasks during creation or scheduling.
- **Notification System**: In-app notification center with user-configurable settings, supporting various notification types (conflict, reminder, success, warning, info) with sound and vibration.
- **Mental Focus Feature (מיקוד מנטלי)**: Displays motivational action phrases during active tasks based on completion percentage zones to maintain focus and drive.
- **HaMefraket (המפרקט) - Smart ADHD Assistant**: An intelligent interface accessible via a split floating button for quick text or voice input, providing detected intent, insights, and self-regulation exercises.

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Database**: PostgreSQL via Prisma 7.
- **Concurrency**: Frontend and backend run together using `concurrently`.
- **API Proxy**: Vite proxies `/api/*` requests to the backend.

### 7-Layer AI Architecture (server/layers/)
A modular architecture for intelligent task management:
1.  **Input Layer**: Normalizes text and cleans filler words.
2.  **Intent Engine**: A 10-step pipeline for detecting language, classifying input type, identifying primary intents, extracting entities (time, date, duration, etc.), detecting commitment and cognitive load, identifying missing information, computing confidence, and providing explainability. Supports Hebrew number words and various intents like `create_task`, `reschedule`, `journal_entry`, etc.
3.  **Decision Engine**: A modular, strategy-based architecture deciding whether to `execute`, `ask`, `reflect`, or `stop` based on confidence thresholds and policies (e.g., one question per turn).
4.  **Task & Time Engine** (`/task`): FULL IMPLEMENTATION - 12 tests passing
   - **TaskTimeEngine**: Main orchestrator with `apply()` method
   - **Directory Structure**:
     - `types/` - Task, Event, ScheduleBlock, payload types
     - `store/` - InMemoryStore with CRUD for tasks, events, notes, scheduleBlocks
     - `planners/` - schedulePlanner (daily scheduling), reshufflePlanner (conflict resolution)
     - `rules/` - mustLockRules, dependencyRules, conflictRules
     - `__tests__/` - 12 unit tests (all passing)
   - **Supported ActionTypes**: create_task, create_event, reschedule, cancel, inquire, log_note
   - **Scheduler Features**:
     - Day window: 08:00-22:00 (configurable)
     - Priority: mustLock > urgency > dependencies
     - Buffer: 5 minutes between blocks
     - Reshuffle: Plan A (shorten) / Plan B (postpone) options
   - **Store State**: tasks[], events[], notes[], scheduleBlocks[], lastQuestion, lastReflection, contextState, decisionLog[]
5.  **Learning Engine** (`/learning`): FULL IMPLEMENTATION - 20 tests passing
   - **LearningEngine**: Main orchestrator with collect, detect, propose, confirm methods
   - **Directory Structure**:
     - `types/` - DecisionLog, OutcomeLog, Pattern, PreferenceRule, PendingRuleProposal
     - `models/` - DecisionLog, PreferenceRule, Pattern, ConfidenceModel
     - `collectors/` - decisionCollector, outcomeCollector
     - `engines/` - patternDetector, ruleProposer, confidenceUpdater, anomalyDetector
     - `policies/` - thresholds, ruleSchemas, decay
     - `store/` - LearningStore (singleton with ILearningStore interface)
     - `__tests__/` - 20 unit tests (all passing)
   - **Features**:
     - 90% automation, 10% questions policy
     - DecisionLog for point-in-time choices (not rules)
     - Pattern detection: priority, schedule, reshuffle, mustLock
     - Confidence model with decay (event-based and time-based)
     - Anomaly detection (cognitive load, excessive must locks, stress)
     - Rule proposals after N observations + user confirmation
   - **Integration**: Hooks into Decision Engine for shouldAskForConfirmation flags
6.  **Automation Layer** (`/automation`): FULL IMPLEMENTATION - 16 tests passing
   - **AutomationLayer**: Main orchestrator with planExternalActions, executeActions, process methods
   - **Directory Structure**:
     - `types/` - Job, AuditLogEntry, ExternalAction, Integration, ConnectorResult
     - `store/` - AutomationStore (singleton with integrations, jobs, auditLog, idempotencyKeys)
     - `queue/` - jobQueue, worker, retryPolicy, rateLimiter, idempotency
     - `router/` - actionRouter, externalActionMapper
     - `connectors/` - Connector interface, MockConnector, GoogleCalendarConnector (scaffold)
     - `policies/` - timeouts, thresholds
     - `__tests__/` - 16 unit tests (all passing)
   - **Features**:
     - Internal-first: Updates InMemoryStore first, then triggers automations
     - Idempotency: Prevents duplicate jobs with hash-based keys
     - Job Queue: Status tracking (queued/running/success/failed/needs_user_action)
     - Retry Policy: Exponential backoff, error classification (transient/permanent/auth)
     - Rate Limiter: Per-provider request limits
     - Audit Log: Hebrew summaries of all external actions
     - Modular Connectors: Interface-based, easy to add new providers
   - **Connectors**:
     - MockConnector: Simulates success/failure for testing
     - GoogleCalendarConnector: Scaffold with OAuth placeholder (TODO: implement OAuth)
7.  **Feedback & Review Layer** (`/feedback`): FULL IMPLEMENTATION - 16 tests passing
   - **FeedbackReviewLayer**: Main orchestrator with processReflection, processPostAction, processAutomationResult methods
   - **Directory Structure**:
     - `types/` - FeedbackMessage, CheckInRequest, FeedbackStats, DailyReviewData
     - `store/` - FeedbackStore (singleton for feedbackFeed, pendingCheckIns, stats, dailyReviewHistory)
     - `generators/` - reflectionGenerator, postActionGenerator, dailyReviewGenerator, microStepGenerator
     - `analyzers/` - gapAnalyzer, successFailureAnalyzer, overloadAnalyzer
     - `policies/` - templates (Hebrew), thresholds, triggers, tonePolicy
     - `__tests__/` - 16 unit tests (all passing)
   - **Features**:
     - Reflection generation after decisions (execute/ask/reflect/stop)
     - Post-action feedback with gap analysis (planned vs actual)
     - Daily review blocked when stress level is high
     - 3-tier tone system: neutral/gentle/direct based on stress
     - Check-in system with 24-hour cooldowns
     - Micro-step suggestions for overloaded/stuck users
     - Overload detection from cognitive load + cancellations + failed jobs
   - **Check-In Types**: duration_mismatch, wrong_intent, stress_signal, automation_failed
   - **UI Components**: FeedbackFeed.tsx, DailyReviewCard.tsx, CheckInModal.tsx
   - **Hebrew Templates**: All feedback messages in Hebrew with variable substitution

**Constraint Types Supported**: deadline, allowed_window, forbidden_window, energy_profile, reduced_load_day.

### API Routes for AI Processing
- `POST /api/analyze` - Full flow: Input → Intent → Decision → TaskEngine
- `POST /api/answer` - Submit answer to pending question
- `POST /api/action` - Direct UI actions (mark_done, cancel, toggle_must_lock, etc.)
- `GET /api/state` - Get current store state
- `GET /api/learning` - Get learning state (rules, patterns, decisions)
- `POST /api/learning/rule/confirm` - Confirm pending rule proposal
- `POST /api/learning/rule/decline` - Decline pending rule proposal
- `POST /api/learning/rule/toggle` - Toggle rule status (pause/resume)
- `POST /api/learning/process` - Process a learning event
- `GET /api/integrations` - Get integration statuses
- `POST /api/integrations/connect` - Connect an integration
- `POST /api/integrations/disconnect` - Disconnect an integration
- `GET /api/automation/jobs` - Get recent automation jobs
- `GET /api/automation/audit` - Get audit log entries
- `POST /api/automation/retry/:jobId` - Retry a failed job
- `GET /api/automation/state` - Get full automation state
- `GET /api/feedback` - Get feedback feed and pending check-ins
- `POST /api/feedback/checkin/respond` - Respond to a check-in question
- `POST /api/feedback/daily-review/request` - Request daily review generation

### AI Lab Frontend (`/ai-lab`)
Visual interface for testing the full AI flow:
- **InputPanel**: Text input with send button
- **AnalysisPanel**: Shows IntentAnalysis (inputType, primaryIntent, entities, missingInfo, confidence)
- **DecisionPanel**: Shows decision (execute/ask/reflect/stop) with reason
- **Timeline**: Daily schedule blocks visualization
- **TaskList**: Interactive task list with done/cancel/mustLock actions
- **QuestionModal**: Popup for answering Decision Engine questions
- **ReflectionCard**: Displays reflection/micro-step messages
- **LearningPanel**: Shows active rules, pending proposals, recent decisions with toggle controls
- **IntegrationsPanel**: Shows integration statuses (Mock, Google Calendar) with connect/disconnect buttons
- **AutomationLogPanel**: Shows audit log entries and job statuses with retry functionality
- **FeedbackFeed**: Shows feedback messages with priority indicators
- **DailyReviewCard**: Shows daily completion stats, blockers, and micro-steps
- **CheckInModal**: Modal for responding to check-in questions

### Test Coverage
- **Total**: 95 tests passing
- Layer 2 (Intent): 19 tests
- Layer 3 (Decision): 12 tests
- Layer 4 (Task): 12 tests
- Layer 5 (Learning): 20 tests
- Layer 6 (Automation): 16 tests
- Layer 7 (Feedback): 16 tests

### Rule Engine / Voice-to-Task Engine
Determines input as `task_or_event` or `journal_entry`. Extracts details for tasks (title, dates, times, location, etc.) and journals (mood, intensity, tags). Features smart title generation, phone call location inference, and identifies actionable tasks from journal entries.

### Database Models
`TaskFile`, `TaskRun`, `RunStep`, `InsightLog`, `UserSettings`, `RegulationLog`.

### Regulation Exercises (ויסות)
Offers breathing exercises, grounding techniques, and quick physical exercises, with completion logged to the database.

### Design Decisions
1.  **Full-Stack Architecture**: Express backend with PostgreSQL.
2.  **RTL Support**: Hebrew language and right-to-left text direction.
3.  **Mobile-First**: Bottom navigation, touch-friendly UI.
4.  **Timer-Centric**: Core focus on the task timer.
5.  **ADHD-Focused**: Simplifies interaction for users with ADHD.

## External Dependencies

### UI Framework
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-styled components.
- **Lucide React**: Icon library.

### Date/Time
- **date-fns**: Date manipulation and formatting with Hebrew locale.

### Forms and Validation
- **React Hook Form**: Form state management.
- **@hookform/resolvers**: Validation resolver integration.
- **Zod**: Schema validation.

### Visualization
- **Recharts**: Charts for statistics.
- **Embla Carousel**: Carousel/slider functionality.

### Other
- **cmdk**: Command palette.
- **Vaul**: Drawer component.
- **next-themes**: Theme switching.
- **sonner**: Toast notifications.
- **Heebo Font**: Hebrew-optimized font.

## Mobile App (React Native + Expo)

### Overview
A companion mobile app built with React Native and Expo that connects to the MA server API. Allows voice and text input from the phone.

### Directory Structure
```
mobile/
  app/                   # Expo Router screens
    _layout.tsx          # Tab navigation with RTL support
    index.tsx            # Input screen (text + voice)
    shikul.tsx           # Questions/check-ins screen
    settings.tsx         # Server configuration
  components/
    QuestionBlock.tsx    # Uniform question block with yes/no/free text
    VoiceInput.tsx       # Voice recording modal
  api/
    MAApiClient.ts       # API client for MA server
  constants/
    Colors.ts            # Theme colors
```

### Features
- **Input Screen**: Text input with send button, microphone for voice input
- **Shikul Screen**: Pending questions from MA with uniform block design (question, free text, buttons)
- **Settings**: Server URL configuration and connection test

### API Integration
- POST /api/analyze - Send text for analysis
- POST /api/answer - Answer a question
- GET /api/feedback - Get pending check-ins
- POST /api/feedback/checkin/respond - Respond to check-in

### Running the Mobile App
```bash
cd mobile
npm install
npm start
```
Then scan QR code with Expo Go app on your phone.

### Limitations (MVP)
- Works only when app is open (no background mode yet)
- Voice input requires real device with Expo Go
- No Volume button trigger (requires native Android)
- No Direct Reply from notifications (requires native Android)