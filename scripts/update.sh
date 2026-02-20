#!/bin/bash
# ==========================================================
# CBT Platform - Server-Side Deploy/Update Script
# This script is run by GitHub Actions on every push to main
# ==========================================================
set -e

cd ~/cbt-platform

echo ">>> Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

echo ">>> Restarting containers (zero-downtime)..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo ">>> Cleaning old images..."
docker image prune -f

echo ">>> Done! App is live."
