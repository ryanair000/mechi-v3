# Admin Broadcast Commands

## WhatsApp Broadcast

### Send to All Mechi Groups
Admin can trigger broadcasts by messaging the control agent with:

```
broadcast whatsapp all: [message]
```

Example:
```
broadcast whatsapp all: 🎮 Weekend Cup check-in is now OPEN! Go to mechi.club/weekendcup/dashboard to check in. Matches start at 8 PM.
```

### Send to Specific Game Group
```
broadcast whatsapp pubg: [message]
broadcast whatsapp codm: [message]
broadcast whatsapp efootball: [message]
```

### Send to Community Group
```
broadcast whatsapp community: [message]
```

## Telegram Broadcast

### Send to MECHI OPS Group
```
broadcast telegram ops: [message]
```

### Send to All Telegram Channels
```
broadcast telegram all: [message]
```

## Scheduled Broadcasts

### Schedule a Message
```
schedule broadcast [channel] [time]: [message]
```

Example:
```
schedule broadcast whatsapp all 2026-05-29T19:00:00+03:00: ⏰ 1 hour to PUBG Mobile! Check in NOW at mechi.club/weekendcup/dashboard
```

### Cancel Scheduled Broadcast
```
cancel broadcast [broadcast_id]
```

## Group Management

### List All Groups
```
list groups whatsapp
list groups telegram
```

### Add Group to Broadcast List
```
add group whatsapp [group_id] [name]
```

### Remove Group from Broadcast List
```
remove group whatsapp [group_id]
```

## Quick Broadcast Templates

### Check-in Open
```
broadcast whatsapp all: 🎮 CHECK-IN IS OPEN!

Go to mechi.club/weekendcup/dashboard and click "Check In" for your game.

⏰ Matches start at 8:00 PM EAT
📱 Make sure you're in the WhatsApp group
🎯 Be ready 15 minutes early

Let's go! 🔥
```

### 1 Hour Warning
```
broadcast whatsapp [game]: ⏰ 1 HOUR TO GO!

[Game] matches start at 8:00 PM EAT.

✅ Check in: mechi.club/weekendcup/dashboard
📱 Stay in this group for room details
🎮 Have your game ready

See you in the lobby! 💪
```

### Room Details
```
broadcast whatsapp [game]: 🎮 ROOM DETAILS

Room ID: [room_id]
Password: [password]

Join NOW. Match starts in 10 minutes.
Late = DQ. No exceptions.
```

### Results Announcement
```
broadcast whatsapp [game]: 🏆 [GAME] RESULTS

🥇 1st: [player] - [kills] kills - KSh [prize]
🥈 2nd: [player] - [kills] kills - KSh [prize]
🥉 3rd: [player] - [kills] kills - KSh [prize]

GGs to everyone who competed! 🎮

Payouts within 48 hours via M-Pesa.
```

## Admin Authorization

Only these users can trigger broadcasts:
- Boss WhatsApp: +254708355692
- Boss Telegram: 6806783421, 6738706706

All broadcast commands are logged and require explicit confirmation before sending.
