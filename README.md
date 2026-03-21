# 🎓 Advanced CBT & LMS Educational Platform

A production-ready **Computer-Based Testing (CBT) and Learning Management System (LMS)** natively built for modern educational institutions. Designed with security, artificial intelligence, and network resilience at its core. Deployed on Oracle Cloud Infrastructure (OCI) via Docker and GitHub Actions CI/CD.

🌐 **Live Web Platform:** [https://your-production-url.com](https://your-production-url.com)

---

## 🌟 Comprehensive Feature Set

### 1. Hierarchical Multi-Role Ecosystem
The platform is built to support massive scale, segmented into distinct access tiers:
*   **👑 Super Administrator**: Platform-wide oversight, SaaS subscription management, global feature toggling, AI limits control, and raw database metrics.
*   **💼 Sales Administrator (Franchise)**: Dedicated marketing portal to onboard schools using unique referral links. Tracks conversions and manages multi-currency NGN/USD commissions.
*   **🏫 School Administrator**: Complete control over a single institution. Manages tutors, students, overall academic calendar, and tracks aggregate performance.
*   **👨‍🏫 Tutor / Instructor**: Exam creation, question bank management, LMS course curation, grading, and detailed cohort analysis.
*   **👨‍🎓 Student / Learner**: A unified studying and testing portal.
*   **👪 Parent Portal** (Coming Soon): Secured PIN and QR-code verified access to student performance data.

### 2. Intelligent LMS Module (Learning Management)
*   **Course Builder**: Hierarchical structure supporting Courses → Modules → Subtopics.
*   **Multimedia Integration**: Support for text content and embedded YouTube instructional videos.
*   **AI Syllabus Generation**: Instantly generate termly syllabuses based on academic grade levels.
*   **Assessment Linking**: "One-Click" AI Exam linking that generates quizzes directly tied to the specific syllabus content read by the student.
*   **Session & Term Filtering**: Dynamic filtering for active academic sessions and calendar terms.

### 3. State-of-the-Art CBT Engine & Offline App
*   **Question Types**: Multiple Choice (MCQ), True/False, Theory, and Fill-in-the-Blank.
*   **Real-time Anti-Cheating**: Tracks visibility API (tab switching), browser minimization, and triggers automatic disqualification thresholds.
*   **Mobile Network Resilience (Offline-First)**: The React Native mobile app features an "Outbox Queue". It saves encrypted exam state (answers, time remaining) locally (`AsyncStorage`) every few seconds. If a student loses network, they can finish the exam, and the app will automatically background-sync the payload the moment they are back online.
*   **Identity Snapshot Storage**: integration with OCI Object Storage to store pre-exam selfie verification snapshots to prevent impersonation.

### 4. Generative AI Superpowers (OpenAI)
*   **Automated Question Generation**: Bulk generate relevant exam questions based on a topic prompt, difficulty level, and format.
*   **Cohort Analysis AI**: Provides tutors and admins with deep insights into where a class is failing and succeeding after an exam batch.
*   **Personalized Study Plans**: Generates individualized weekly actionable study routines for students based on their specific weaknesses in past exams.
*   **AI Coach Chatbot**: Native integration in the course player guiding students step-by-step.

### 5. Robust Monetization & SaaS Billing
*   **Automated Gateways**: Integrated with Stripe (USD) and Paystack (NGN), along with Crypto Verification (USDT).
*   **Flexible Subscriptions**: Schools can subscribe to `Basic`, `Advanced`, `Advanced Plus`, or `Enterprise` tiers with Monthly or Yearly billing cycles (incorporating SuperAdmin-defined percentage discounts).
*   **Coupon & Promo Codes**: Seamlessly apply validation discounts directly at checkout, controlled dynamically by SuperAdmins.
*   **Smart Subscription Gating**: Frontend UI sidebars and API routes are strictly protected by a `planGuard` middleware.
*   **Marketplace (PAYG)**: Schools can purchase "extra credits" for AI generation or student packs without upgrading their entire subscription plan.
*   **Granular Feature Gifting**: SuperAdmins can permanently unlock specific features (like Advanced Analytics or LMS) for individual schools overriding default plan logic.

### 6. Deep Analytics & Grading
*   **Continuous Assessment (CA) Engine**: Configurable weighting logic (e.g., 10% Attendance, 30% Test, 60% Exam) mapped directly to Term Report Cards.
*   **Global Traffic & Event Tracking**: Built-in generic intelligence API monitoring total platform interactions.

---

## 🛠 Tech Stack Details

| Component | Technology | Description |
|-----------|-----------|-------------|
| **Backend API** | Node.js 18, Express, TypeScript | Highly strongly-typed REST architecture with JWT (RS256) auth. |
| **Database** | PostgreSQL 15 | Relational integrity holding JSONB config payloads. |
| **Frontend Web** | React 18, Vite, TypeScript | Styled with Tailwind CSS & Radix/Shadcn UI components. |
| **Mobile App** | React Native (Expo) | Cross-platform repository mapped to Android/iOS build pipelines (EAS). |
| **Lint/Format** | ESLint v9 (Flat Config) | Enforces "Perfect Builds" rejecting impure functions across TS/TSX. |
| **Storage** | Oracle Cloud (OCI SDK) | Object storage mapped for profile avatars and exam assets. |
| **Hosting Deployment** | Docker + Compose | Containerized and deployed via GitHub Actions to OCI ARM architecture. |

---

## 🧠 Developer Onboarding & Architecture Guide

Welcome, new developers! This platform is designed to be highly modular. Here is a breakdown to get you oriented rapidly.

### 1. Repository Structure
*   `backend/`: Node.js/Express REST API. 
    *   **Core Logic:** `src/controllers` and `src/services`.
    *   **Architecture:** Controllers handle HTTP req/res, while Services handle heavy business logic (AI generation, Commission calculations, DB queries).
*   `frontend/`: React 18 SPA built with Vite. 
    *   **State & API:** We use Axios for API calls and React Context for global state (e.g., `useAuth`, `usePlan`).
    *   **UI System:** Built strictly on **Tailwind CSS** and **Shadcn UI** (`src/components/ui`).
*   `mobile-app/`: React Native mobile application built with **Expo**.
    *   **Key Focus:** Offline-first architecture (`AsyncStorage` + NetInfo) taking exams without internet.

### 2. Core Database Entities (PostgreSQL)
*   `schools` / `users`: Base multi-tenant architecture. Every user belongs to a school (except Super/Sales Admins).
*   `plan_definitions` / `subscriptions`: Drives the Monetization engine. Controls what a school can access.
*   `exams` / `questions`: The CBT Engine.
*   `course_modules` / `course_progress`: The LMS Engine connecting lessons to linked exams.
*   `exam_results`: Highly detailed JSON arrays storing analytical matrices of student performance.

### 3. Linting & Code Quality
We enforce a strict "Perfect Build" policy using **ESLint v9 (Flat Config)**.
*   Backend: `cd backend && npm run lint`
*   Frontend: `cd frontend && npm run lint`
*   **Rule:** Zero errors are expected before pushing. `tsc` (TypeScript Compiler) must also pass cleanly.

---

## 🚀 Local Development Setup

### Prerequisites
- Docker Desktop (recommended) **or** local Node.js 18+ and PostgreSQL 15+
- Git

### 1. Docker Environment (Recommended)
This approach isolates the `node_modules` and database seamlessly.

```bash
git clone https://github.com/Modiamomndstar/cbt-platform.git
cd cbt-platform

# 1. Prepare environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your local credentials

# 2. Start the containerized stack
docker compose up -d --build

# 3. View logs
docker compose logs -f backend
```
Access the application locally:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

### 2. Manual Environment Setup

If you prefer running services directly via npm:

```bash
# Terminal 1: Setup Backend
cd backend
npm install
npm run dev

# Terminal 2: Setup Frontend
cd frontend
npm install
npm run dev
```

---

## 🔒 Environment Secrets & Configuration

The `backend/.env` file requires the following structure to fully operate the LMS and Monetization engines:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `development` or `production` | Yes |
| `PORT` | Server port (default: 5000) | Yes |
| `DB_HOST` / `PORT` / `NAME` | PostgreSQL credentials | Yes |
| `JWT_SECRET` | Strong random secret for RS256 signing | **Yes** |
| `OPENAI_API_KEY` | Key required for LMS generation and Cohort analysis | No |
| `STRIPE_SECRET_KEY` | Processing international school subscriptions | No |
| `PAYSTACK_SECRET_KEY` | Processing local school subscriptions | No |
| `OCI_TENANCY` / `USER` | Oracle Cloud Storage Credentials | No |

> ⚠️ Never commit `.env` files. Ensure they are injected directly into your CI/CD pipeline secrets.

---

## 📡 Core API Overview

The backend uses a standard REST architecture. All protected routes require a `Bearer <token>` utilizing JWT RS256.

### Authentication & Roles
| Route | Method | Description |
|---|---|---|
| `/api/auth/superadmin/login` | `POST` | Master login. |
| `/api/auth/salesadmin/login` | `POST` | Franchise/Sales admin login. |
| `/api/auth/school/login` | `POST` | School Admin login. |
| `/api/auth/tutor/login` | `POST` | Tutor login. |
| `/api/auth/student/login` | `POST` | Student portal login. |

### LMS & Courses (Gated)
| Route | Method | Description |
|---|---|---|
| `/api/courses` | `GET/POST` | Fetch or create macro-courses. |
| `/api/courses/:id/modules` | `POST` | Add instructional modules & subtopics. |
| `/api/courses/student/dashboard-context` | `GET` | Fetch active term schedule for a student. |

### CBT Engine & Exams
| Route | Method | Description |
|---|---|---|
| `/api/exams` | `GET/POST` | Manage exams, time limits, and configs. |
| `/api/exams/:id/submit` | `POST` | Submit decrypted exam payload payload. |
| `/api/results/cumulative-report` | `GET` | Generates Session/Term C.A reports. |

### AI Integration
| Route | Method | Description |
|---|---|---|
| `/api/questions/ai-generate` | `POST` | Stream bulk OpenAI generated questions. |
| `/api/ai/syllabus-generate` | `POST` | Autogenerate a course curriculum. |
| `/api/ai/cohort-analysis` | `GET/POST` | Analyze a class's weakness on an exam. |

### Monetization & Marketplace
| Route | Method | Description |
|---|---|---|
| `/api/billing/subscribe/stripe` | `POST` | Initializes Stripe plan checkout. |
| `/api/marketplace/purchase` | `POST` | Buys PAYG credits (AI limits / add-ons). |
| `/api/super-admin/payg/gift` | `POST` | Gifts features/overrides to a school. |

---

## 🚢 CI/CD Production Deployment 
The repository includes a highly optimized `.github/workflows/deploy.yml` pipeline triggering on merges to the `main` branch. 

**Deployment Flow:**
1. Actions checks out the repository.
2. Authenticates and packages backend/frontend Docker images via Github Container Registry (`GHCR`).
3. Logs securely into the Oracle Cloud via SSH.
4. Pulls the latest containers, applies Prisma/SQL migrations, and restarts the Caddy Reverse Proxy.

To configure, provide `OCI_HOST`, `OCI_USER`, `OCI_SSH_PRIVATE_KEY`, and `GHCR_PAT` in the repository secrets.

---

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/advanced-lms`
3. Commit locally: `git commit -m 'feat: added advanced lms capabilities'`
4. Push: `git push origin feature/advanced-lms`
5. Open a Pull Request reviewing your additions against `main`.

---

*Engineered for Scale. Built by the CBT Platform Team.*
