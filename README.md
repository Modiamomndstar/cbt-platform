# CBT Platform - Complete Computer-Based Testing System

A full-featured, production-ready Computer-Based Testing (CBT) platform with multi-role authentication, payment integration, and comprehensive exam management.

## Features

### Multi-Role Authentication
- **Super Admin**: Platform-wide management
- **School Admin**: School registration and management
- **Tutor**: Exam creation and student management
- **Student**: Take exams and view results

### Exam Management
- Create and manage exams with multiple question types
- AI-powered question generation (OpenAI integration)
- Bulk question upload via CSV
- Randomized question order for students
- Time-limited exams with automatic submission

### Student Categories/Levels
- Organize students by class/level (JSS1, SS2, etc.)
- Filter and manage students by category
- Category-based exam scheduling

### Payment Integration
- **Stripe**: For international payments
- **Paystack**: For Nigeria/Africa payments
- Subscription-based pricing plans
- Automatic subscription management

### Scheduling & Results
- Schedule exams for specific students
- Generate unique access codes
- Auto-grading for objective questions
- Manual grading for theory questions
- Comprehensive analytics and statistics

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+
- **Authentication**: JWT
- **Email**: Nodemailer
- **AI**: OpenAI GPT
- **Payments**: Stripe & Paystack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context
- **HTTP Client**: Axios

### Mobile App
- **Framework**: React Native (Expo)
- **Platform**: iOS & Android

## Project Structure

```
cbt-platform/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/       # Database & app config
│   │   ├── middleware/   # Auth & validation
│   │   ├── routes/       # API routes
│   │   ├── services/     # Email & other services
│   │   └── utils/        # Logger & utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # React web app
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service
│   │   └── types/        # TypeScript types
│   └── package.json
├── mobile-app/           # React Native app
├── database/
│   └── schema.sql        # PostgreSQL schema
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/cbt-platform.git
cd cbt-platform
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb cbt_platform

# Run schema
psql -d cbt_platform -f database/schema.sql
```

### 3. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Required: Database credentials, JWT secret

# Install dependencies
npm install

# Run migrations (if any)
npm run db:migrate

# Start development server
npm run dev
```

Backend will run on `http://localhost:5000`

### 4. Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 5. Default Login Credentials

**Super Admin:**
- Email: admin@cbtplatform.com
- Password: SuperAdmin123!

## Deployment Guide

### GitHub Hosting

#### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Name your repository (e.g., `cbt-platform`)
3. Choose Public or Private
4. Click "Create repository"

#### 2. Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - CBT Platform"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/cbt-platform.git

# Push to GitHub
git push -u origin main
```

#### 3. GitHub Actions (Optional - Auto Deploy)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy CBT Platform

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Deploy to Server
      run: |
        # Add your deployment commands here
        echo "Deploying..."
```

### Oracle Cloud Free Tier Deployment

#### 1. Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Sign up for a Free Tier account
3. Verify your email and complete registration

#### 2. Create Compute Instance (VM)

1. Log in to Oracle Cloud Console
2. Go to **Compute** → **Instances**
3. Click **Create Instance**
4. Configure:
   - Name: `cbt-platform-server`
   - Shape: VM.Standard.E2.1.Micro (Always Free)
   - OS: Ubuntu 22.04
   - Add SSH key (generate new or upload existing)
5. Click **Create**

#### 3. Configure Security Rules

1. Go to **Networking** → **Virtual Cloud Networks**
2. Click your VCN → **Security Lists**
3. Click **Default Security List**
4. Add Ingress Rules:
   - **Rule 1**: 
     - Source CIDR: `0.0.0.0/0`
     - Destination Port Range: `80`
   - **Rule 2**:
     - Source CIDR: `0.0.0.0/0`
     - Destination Port Range: `443`
   - **Rule 3**:
     - Source CIDR: `0.0.0.0/0`
     - Destination Port Range: `5000`
   - **Rule 4**:
     - Source CIDR: `0.0.0.0/0`
     - Destination Port Range: `22`

#### 4. Connect to Instance

```bash
# Using SSH
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_INSTANCE_IP
```

#### 5. Install Dependencies on Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

#### 6. Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE cbt_platform;

# Create user
CREATE USER cbt_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cbt_platform TO cbt_user;

# Exit
\q
```

#### 7. Clone and Setup Application

```bash
# Create app directory
mkdir -p /var/www/cbt-platform
cd /var/www/cbt-platform

# Clone repository
git clone https://github.com/YOUR_USERNAME/cbt-platform.git .

# Setup Backend
cd backend
npm install
npm run build

# Create production .env file
cat > .env << EOF
NODE_ENV=production
PORT=5000
API_URL=http://YOUR_INSTANCE_IP:5000
FRONTEND_URL=http://YOUR_INSTANCE_IP

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cbt_platform
DB_USER=cbt_user
DB_PASSWORD=your_secure_password

JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

SUPER_ADMIN_EMAIL=admin@cbtplatform.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!

# Add other configurations (email, payments, etc.)
EOF

# Run database schema
psql -U cbt_user -d cbt_platform -f ../database/schema.sql

# Start backend with PM2
pm2 start dist/server.js --name "cbt-backend"
pm2 save
pm2 startup

# Setup Frontend
cd ../frontend
npm install
npm run build

# Copy build to nginx
sudo cp -r dist/* /var/www/html/
```

#### 8. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/cbt-platform
```

Add configuration:

```nginx
server {
    listen 80;
    server_name YOUR_INSTANCE_IP;

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/cbt-platform /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

#### 9. Setup SSL (Let's Encrypt) - Optional but Recommended

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

#### 10. Update Application

When you push updates to GitHub:

```bash
cd /var/www/cbt-platform
git pull origin main

# Update backend
cd backend
npm install
npm run build
pm2 restart cbt-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Secret key for JWT | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | Yes |
| `SMTP_HOST` | SMTP server host | No |
| `SMTP_PORT` | SMTP server port | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | No |
| `OPENAI_API_KEY` | OpenAI API key | No |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key | No |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key | No |

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/school/login` | School admin login |
| POST | `/api/auth/tutor/login` | Tutor login |
| POST | `/api/auth/student/login` | Student login |
| POST | `/api/auth/super-admin/login` | Super admin login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |

### School Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/schools/register` | Register new school |
| GET | `/api/schools/profile` | Get school profile |
| PUT | `/api/schools/profile` | Update school profile |
| GET | `/api/schools/dashboard` | Get dashboard stats |

### Tutor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tutors` | Get all tutors |
| POST | `/api/tutors` | Create tutor |
| PUT | `/api/tutors/:id` | Update tutor |
| DELETE | `/api/tutors/:id` | Delete tutor |
| POST | `/api/tutors/bulk` | Bulk create tutors |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Get all students |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| POST | `/api/students/bulk` | Bulk create students |

### Exam Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exams` | Get all exams |
| POST | `/api/exams` | Create exam |
| GET | `/api/exams/:id` | Get exam details |
| PUT | `/api/exams/:id` | Update exam |
| DELETE | `/api/exams/:id` | Delete exam |
| POST | `/api/exams/:id/publish` | Publish exam |
| POST | `/api/exams/:id/unpublish` | Unpublish exam |

### Schedule Endpoints (CRITICAL FIX)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedules/available-students` | Get students available for scheduling |
| GET | `/api/schedules/exam/:examId` | Get scheduled students |
| POST | `/api/schedules` | Schedule students |
| PUT | `/api/schedules/:id` | Update schedule |
| DELETE | `/api/schedules/:id` | Cancel schedule |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/plans` | Get payment plans |
| POST | `/api/payments/stripe/create-intent` | Create Stripe payment |
| POST | `/api/payments/paystack/initialize` | Initialize Paystack |
| GET | `/api/payments/subscription` | Get subscription status |

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Backend Issues

```bash
# Check PM2 logs
pm2 logs cbt-backend

# Restart backend
pm2 restart cbt-backend
```

### Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@cbtplatform.com or create an issue on GitHub.

---

**Built with by the CBT Platform Team**
