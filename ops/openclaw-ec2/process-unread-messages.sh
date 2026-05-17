#!/bin/bash
# Script to trigger OpenClaw to process any unread WhatsApp messages
# Run this after reconnecting or if messages were missed

echo "=== Processing unread WhatsApp messages ==="

# The openclaw gateway should automatically process unread messages on connect
# This script restarts the gateway to force a fresh sync

# Restart the service to trigger message sync
if systemctl is-active --quiet openclaw; then
    echo "Restarting OpenClaw to sync unread messages..."
    sudo systemctl restart openclaw
    sleep 10
    echo "OpenClaw restarted. Checking status..."
    sudo systemctl status openclaw --no-pager | head -20
else
    echo "OpenClaw service not running. Starting..."
    sudo systemctl start openclaw
    sleep 10
    sudo systemctl status openclaw --no-pager | head -20
fi

echo ""
echo "Check logs for message processing:"
echo "  sudo journalctl -u openclaw -f"
echo "  tail -f /var/log/openclaw/gateway.log"
