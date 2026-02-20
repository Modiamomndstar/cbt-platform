# CBT Platform

A production-ready **Computer-Based Testing (CBT)** platform built for schools — enabling exam creation, student management, scheduling, and detailed result analytics. Deployed on Oracle Cloud Infrastructure (OCI) via Docker and GitHub Actions CI/CD.

🌐 **Live:** [http://145.241.97.246](http://145.241.97.246)

---

## Features

### Multi-Role System
| Role | Capabilities |
|------|-------------|
| **Super Admin** | Platform-wide management, school approval |
| **School Admin** | School setup, tutor & student management |
| **Tutor** | Exam creation, question management, scheduling |
| **Student** | Take exams, view results via student portal |

### Exam Management
- Multiple question types: MCQ, True/False, Theory
- AI-powered question generation (OpenAI)
- Bulk question upload via CSV
- Randomized question order per student
- Time-limited exams with auto-submission

### Student & School Features
- Student categories/classes (JSS1, SS2, etc.)
- CSV bulk import for students and tutors
- School logo upload & profile management
- Unique per-student exam access credentials

### Scheduling & Results
- Schedule exams for specific students or categories
- Auto-grading for objective questions
- Manual grading for theory questions
- Analytics dashboard with pass/fail breakdown

### Payment Integration
- **Stripe** — international payments
- **Paystack** — Nigeria/Africa payments
- Subscription plans with automatic management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 18, Express.js, TypeScript |
| **Database** | PostgreSQL 15 |
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Mobile** | React Native (Expo) — iOS & Android |
| **Auth** | JWT (RS256, 7-day expiry) |
| **Reverse Proxy** | Caddy 2 (auto HTTPS) |
| **Container** | Docker + Docker Compose |
| **Registry** | GitHub Container Registry (GHCR) |
| **CI/CD** | GitHub Actions |
| **Hosting** | Oracle Cloud Infrastructure (Always Free) |

---

## Project Structure

```
cbt-platform/
├── .github/workflows/     # CI/CD pipeline (build, push, deploy)
├── backend/               # Node.js/Express API
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── middleware/    # Auth & validation
│   │   ├── routes/        # API routes
│   │   ├── services/      # Email & services
│   │   └── utils/         # Logger
│   └── Dockerfile
├── frontend/              # React web app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── types/         # TypeScript types
│   └── Dockerfile
├── mobile-app/            # React Native (Expo)
├── Caddyfile              # Reverse proxy config
├── docker-compose.yml     # Local development
└── docker-compose.prod.yml # Production deployment
```

---

## Local Development

### Prerequisites
- Docker Desktop (recommended) **or** Node.js 18+ and PostgreSQL 15+
- Git

### Docker (Recommended)

```bash
git clone https://github.com/Modiamomndstar/cbt-platform.git
cd cbt-platform

# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your values (see Environment Variables section)

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Without Docker

```bash
# Backend
cd backend
npm install
npm run dev   # runs on http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # runs on http://localhost:5173
```

---

## Environment Variables

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `development` or `production` | Yes |
| `PORT` | Server port (default: 5000) | Yes |
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port (default: 5432) | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Strong random secret for JWT signing | **Yes** |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) | Yes |
| `FRONTEND_URL` | Allowed CORS origin | Yes |
| `SUPER_ADMIN_USERNAME` | Super admin login username | Yes |
| `SUPER_ADMIN_PASSWORD` | Super admin login password | Yes |
| `OPENAI_API_KEY` | OpenAI key (AI question generation) | No |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | No |

> ⚠️ Never commit `.env` or `.env.production` files to the repository.

---

## Deployment (OCI via GitHub Actions)

The CI/CD pipeline automatically builds and deploys on every push to `main`.

### Required GitHub Secrets

Configure these in **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `OCI_HOST` | Server IP address |
| `OCI_USER` | SSH username (e.g. `ubuntu`) |
| `OCI_SSH_PRIVATE_KEY` | Private SSH key (PEM format) |
| `GHCR_PAT` | GitHub Personal Access Token (with `packages:write`) |

### Pipeline Steps

1. **Build** — Docker images compiled for `linux/amd64` + `linux/arm64`
2. **Push** — Images pushed to GHCR tagged with commit SHA
3. **Deploy** — SSH into OCI server, pull new images, restart services

### Server `.env.production`

On first setup, create `~/cbt-platform/.env.production` on the server with all required variables (see table above). This file is **not** managed by CI/CD for security reasons.

---

## API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/school/login` | School admin login |
| `POST /api/auth/tutor/login` | Tutor login |
| `POST /api/auth/student/login` | Student exam login |
| `GET /api/auth/me` | Current user info |
| `POST /api/schools/register` | Register a new school |
| `GET /api/schools/profile` | School profile |
| `GET /api/exams` | List exams |
| `POST /api/questions/ai-generate` | AI question generation |
| `POST /api/uploads/image` | Upload school logo / image |
| `GET /api/health` | Health check |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request against `main`

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built by the CBT Platform Team*
