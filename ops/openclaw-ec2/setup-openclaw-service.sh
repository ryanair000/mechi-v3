#!/bin/bash
set -e

echo "=== Setting up OpenClaw as systemd service ==="

# Create log directory
sudo mkdir -p /var/log/openclaw
sudo chown ubuntu:ubuntu /var/log/openclaw

# Create tmp directory
mkdir -p /tmp/openclaw

# Stop any running openclaw processes
pkill -f openclaw-gateway 2>/dev/null || true
sleep 2

# Copy service file
sudo cp /home/ubuntu/openclaw.service /etc/systemd/system/openclaw.service

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable openclaw

# Start the service
sudo systemctl start openclaw

# Wait and check status
sleep 5
sudo systemctl status openclaw --no-pager

echo ""
echo "=== OpenClaw service installed ==="
echo "Commands:"
echo "  sudo systemctl status openclaw  - Check status"
echo "  sudo systemctl restart openclaw - Restart"
echo "  sudo journalctl -u openclaw -f  - View logs"
echo "  tail -f /var/log/openclaw/gateway.log - View output"
