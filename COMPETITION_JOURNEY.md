# Competition Journey: Step-by-Step

Based on the implemented codebase, here is the complete, step-by-step journey of how the Competition feature works within the platform.

## Phase 1: Creation and Configuration (Super Admin / Platform Staff)
1. **Create the Competition**: A staff member logs into the platform and creates a new competition via the `/api/competitions` endpoint. They define the global rules, scope (local, national, global), target regions, violation thresholds, negative marking rates, and auto-promotion settings.
2. **Define Categories**: The staff member adds Age/Grade-based Categories (e.g., "Junior Boys (Age 10-13)", "Senior Girls (Grade 10-12)").
3. **Build the Stages**: For each category, the staff member defines the Stages (e.g., "Stage 1: Qualifiers", "Stage 2: Semi-Finals", "Stage 3: Grand Finale"). They set the duration, total questions, and most importantly, the **Qualification Threshold** (e.g., "Must score 70% to adavnce").
4. **Attach Rewards**: The staff member defines what the winners get (e.g., "Rank 1 gets $500", "Rank 2-5 gets a Certificate").
5. **Open Registration**: Finally, the staff changes the competition status to `registration_open`. This triggers an automated broadcast message to all schools on the platform.

## Phase 2: Discovery and Registration (School Admin & Students)
1. **Discovery (School)**: School Admins view a dashboard of "Available Competitions" customized to their country/region.
2. **Bulk Registration**: The School Admin selects a competition category and bulk-registers their eligible students via the `/api/competitions/:id/register` endpoint.
3. **Student View**: Registered students can log into their dashboard and immediately see their upcoming competitions under the "My Competitions" section.
4. **External Students**: The platform also supports external students who can participate without needing a full school profile, linking directly via `external_student_id`.

## Phase 3: The Competition Begins (Exam Execution)
1. **Taking the Exam**: When the competition status changes to `exam_in_progress` (triggering another broadcast), students enter the exam room.
2. **Anti-Cheating Engine**: During the exam, the frontend monitors the student. If they switch tabs or minimize the browser, a violation is recorded.
3. **Submission & Grading**: The student submits the exam (via `/api/student-exams/submit`). The backend (`results.ts`) instantly grades the submission.
4. **Violation Handling**: The backend checks the accumulated violations against the competition's `max_violations` rule. If exceeded, the student is instantly marked as `isDisqualified` and their score doesn't count.

## Phase 4: Progression and Leaderboard (Post-Exam)
1. **Auto-Promotion**: If the student passed the qualification threshold for that stage, and the competition has `auto_promote: true`, the backend automatically triggers the `promotionService.promoteStudents()`. This creates a new exam schedule for the student in the *next* stage.
2. **Real-Time Leaderboard**: As students finish, the public leaderboard (accessible via `/api/results/leaderboard/:competitionId`) updates in real-time. It groups students by category and stage, showing their scores, time spent, and school details.
3. **Final Rewards**: Once all stages are completed and the competition marked as `completed`, the system uses the final leaderboard to distribute the configured digital rewards and certificate templates to the top-ranking students.
