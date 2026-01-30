#!/bin/bash

# CBT Platform Deployment Script for Oracle Cloud Free Tier
# This script automates the deployment process

set -e  # Exit on error

echo "======================================"
echo "CBT Platform Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/cbt-platform"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="cbt_platform"
DB_USER="cbt_user"

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js
print_status "Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
print_status "Node.js version: $(node -v)"
print_status "npm version: $(npm -v)"

# Install PostgreSQL
print_status "Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Install Nginx
print_status "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Install PM2
print_status "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Install Git
print_status "Installing Git..."
apt install -y git

# Setup Database
print_status "Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$(openssl rand -base64 32)';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

print_status "Database setup complete!"
print_warning "Please note the database password from above and update your .env file"

# Create app directory
print_status "Creating application directory..."
mkdir -p $APP_DIR

# Clone repository (if not exists)
if [ ! -d "$APP_DIR/.git" ]; then
    print_status "Cloning repository..."
    print_warning "Please enter your GitHub repository URL:"
    read REPO_URL
    git clone $REPO_URL $APP_DIR
else
    print_status "Repository already exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main
fi

# Setup Backend
print_status "Setting up backend..."
cd $BACKEND_DIR

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create .env file if not exists
if [ ! -f ".env" ]; then
    print_status "Creating backend .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=5000
API_URL=http://$(curl -s ifconfig.me):5000
FRONTEND_URL=http://$(curl -s ifconfig.me)

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD_HERE

# JWT
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d

# Super Admin
SUPER_ADMIN_EMAIL=admin@cbtplatform.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!

# Email (Configure these)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@cbtplatform.com
FROM_NAME=CBT Platform

# Payments (Configure these)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

# OpenAI (Configure this)
OPENAI_API_KEY=
EOF
    print_warning "Please edit $BACKEND_DIR/.env with your actual configuration values"
fi

# Setup Frontend
print_status "Setting up frontend..."
cd $FRONTEND_DIR

# Install dependencies
npm install

# Build frontend
npm run build

# Create .env file if not exists
if [ ! -f ".env" ]; then
    print_status "Creating frontend .env file..."
    cat > .env << EOF
VITE_API_URL=http://$(curl -s ifconfig.me):5000/api
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_PAYSTACK_PUBLIC_KEY=
EOF
    print_warning "Please edit $FRONTEND_DIR/.env with your actual configuration values"
fi

# Copy frontend build to nginx
print_status "Copying frontend to Nginx..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/cbt-platform << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
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

    # Static files
    location /uploads {
        alias /var/www/cbt-platform/backend/uploads;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/cbt-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Start/Restart Backend with PM2
print_status "Starting backend with PM2..."
cd $BACKEND_DIR

if pm2 list | grep -q "cbt-backend"; then
    pm2 restart cbt-backend
else
    pm2 start dist/server.js --name "cbt-backend"
fi

pm2 save
pm2 startup systemd -u root --hp /root

# Setup firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 5000/tcp
    ufw --force enable
fi

# Create update script
print_status "Creating update script..."
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash

cd /var/www/cbt-platform

echo "Updating CBT Platform..."

# Pull latest changes
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
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

echo "Update complete!"
EOF

chmod +x $APP_DIR/update.sh

print_status "======================================"
print_status "Deployment Complete!"
print_status "======================================"
echo ""
echo "Your CBT Platform is now deployed!"
echo ""
echo "Access your application at:"
echo "  - Frontend: http://$(curl -s ifconfig.me)"
echo "  - Backend API: http://$(curl -s ifconfig.me):5000"
echo ""
echo "Default Super Admin Credentials:"
echo "  - Email: admin@cbtplatform.com"
echo "  - Password: SuperAdmin123!"
echo ""
echo "Important Next Steps:"
echo "  1. Edit $BACKEND_DIR/.env with your actual database password and other configs"
echo "  2. Edit $FRONTEND_DIR/.env with your API URL"
echo "  3. Run database migrations if needed"
echo "  4. Configure SSL with: certbot --nginx"
echo "  5. Set up payment provider credentials"
echo ""
echo "Useful Commands:"
echo "  - View logs: pm2 logs cbt-backend"
echo "  - Restart backend: pm2 restart cbt-backend"
echo "  - Update app: $APP_DIR/update.sh"
echo ""
