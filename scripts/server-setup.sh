#!/bin/bash
# ==========================================================
# CBT Platform - One-Time Server Bootstrap Script
# Run this ONCE after first SSH into your OCI server
# ==========================================================
set -e

echo ">>> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo ">>> Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

echo ">>> Adding current user to docker group (no sudo needed)..."
sudo usermod -aG docker $USER

echo ">>> Installing Docker Compose plugin..."
sudo apt-get install -y docker-compose-plugin

echo ">>> Opening firewall ports (80, 443)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo ">>> Creating app directory..."
mkdir -p ~/cbt-platform
cd ~/cbt-platform

echo ""
echo "========================================="
echo "Server setup complete!"
echo "IMPORTANT: Log out and SSH back in for"
echo "docker group changes to take effect."
echo "========================================="
