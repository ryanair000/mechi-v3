#!/bin/bash
cd /home/ubuntu/.openclaw
cat openclaw.json | jq '.channels.telegram.allowFrom = ["*"]' > tmp.json && mv tmp.json openclaw.json
echo "Telegram allowFrom set to everyone"
