"use strict";exports.id=8681,exports.ids=[8681],exports.modules={28420:(a,b,c)=>{c.d(b,{Ab:()=>f,MI:()=>k,Tg:()=>m,Vo:()=>e,Zv:()=>j,fu:()=>o,gk:()=>l,vf:()=>d,we:()=>n});let d=["efootball","fc26","mk11","nba2k26","tekken8","sf6","ludo"],e={win:120,loss:40,firstMatchOfDayBonus:60,winStreakBonus:30,achievementUnlock:200,inviteFriend:300,shareMatchResult:50},f={win:50,loss:15,achievementUnlock:150,dailyLoginBonus:25},g=[{min:0,max:999,tier:"Bronze",division:"III",color:"#CD7F32"},{min:1e3,max:1049,tier:"Bronze",division:"II",color:"#CD7F32"},{min:1050,max:1099,tier:"Bronze",division:"I",color:"#CD7F32"},{min:1100,max:1149,tier:"Silver",division:"III",color:"#C0C0C0"},{min:1150,max:1199,tier:"Silver",division:"II",color:"#C0C0C0"},{min:1200,max:1299,tier:"Silver",division:"I",color:"#C0C0C0"},{min:1300,max:1349,tier:"Gold",division:"III",color:"#FFD700"},{min:1350,max:1399,tier:"Gold",division:"II",color:"#FFD700"},{min:1400,max:1499,tier:"Gold",division:"I",color:"#FFD700"},{min:1500,max:1549,tier:"Platinum",division:"III",color:"#00CED1"},{min:1550,max:1599,tier:"Platinum",division:"II",color:"#00CED1"},{min:1600,max:1699,tier:"Platinum",division:"I",color:"#00CED1"},{min:1700,max:1749,tier:"Diamond",division:"III",color:"#60A5FA"},{min:1750,max:1799,tier:"Diamond",division:"II",color:"#60A5FA"},{min:1800,max:1899,tier:"Diamond",division:"I",color:"#60A5FA"},{min:1900,max:1/0,tier:"Legend",division:"",color:"#A855F7"}];function h(a,b,c,d,e,f,g){return{key:a,title:b,description:c,emoji:d,xpReward:e,mpReward:f,check:g}}let i=[h("first_blood","First Blood","Win your first match","\uD83E\uDD47",200,150,a=>a.totalWins>=1),h("dime","Dime","Win 10 matches","\uD83D\uDD1F",200,150,a=>a.totalWins>=10),h("century","Century","Win 100 matches","\uD83D\uDCAF",300,200,a=>a.totalWins>=100),h("unstoppable","Unstoppable","Win 500 matches","⚡",500,300,a=>a.totalWins>=500),h("hat_trick","Hat Trick","Win 3 in a row","\uD83D\uDD25",200,150,a=>a.winStreak>=3),h("inferno","Inferno","Win 5 in a row","\uD83D\uDD25\uD83D\uDD25",300,200,a=>a.winStreak>=5),h("goated","GOATed","Win 10 in a row","\uD83D\uDC10",500,300,a=>a.winStreak>=10),h("efootball_god","eFootball God","Win 50 eFootball matches","⚽",300,200,a=>(a.gameWins.efootball??0)>=50),h("tekken_master","Tekken Master","Win 50 Tekken 8 matches","\uD83D\uDC4A",300,200,a=>(a.gameWins.tekken8??0)>=50),h("buckets","Buckets","Win 50 NBA 2K26 matches","\uD83C\uDFC0",300,200,a=>(a.gameWins.nba2k26??0)>=50),h("street_legend","Street Legend","Win 50 Street Fighter 6 matches","\uD83E\uDD4A",300,200,a=>(a.gameWins.sf6??0)>=50),h("pitch_king","Pitch King","Win 50 EA FC 26 matches","\uD83C\uDFC6",300,200,a=>(a.gameWins.fc26??0)>=50),h("krypt_keeper","Krypt Keeper","Win 50 MK11 matches","\uD83E\uDD4A",300,200,a=>(a.gameWins.mk11??0)>=50),h("silver_certified","Silver Certified","Reach Silver rank","\uD83E\uDD48",200,150,a=>(a.eloAfterWin??0)>=1100),h("gold_certified","Gold Certified","Reach Gold rank","\uD83E\uDD47",300,200,a=>(a.eloAfterWin??0)>=1300),h("diamond_certified","Diamond Certified","Reach Diamond rank","\uD83D\uDC8E",400,250,a=>(a.eloAfterWin??0)>=1700),h("legend","Legend","Reach Legend rank","\uD83D\uDFE3",500,300,a=>(a.eloAfterWin??0)>=1900)];function j(a){let b,c=Math.max(0,Math.floor(a)),d=1;for(;c>=500*((b=Math.max(1,Math.floor(d+1)))-1)*b/2;)d+=1;return d}function k(a){let b=Math.max(0,Math.floor(a)),c=g.find(a=>b>=a.min&&b<=a.max)??g[0];return{tier:c.tier,division:c.division,label:c.division?`${c.tier} ${c.division}`:c.tier,color:c.color}}function l(a){let b=new Set(a.achievementsUnlocked);return i.filter(c=>!b.has(c.key)&&c.check(a))}function m(a){return{key:a.key,title:a.title,description:a.description,emoji:a.emoji,xpReward:a.xpReward,mpReward:a.mpReward}}function n(a=new Date){let b=new Intl.DateTimeFormat("en",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(a),c=b.find(a=>"year"===a.type)?.value??"1970",d=b.find(a=>"month"===a.type)?.value??"01",e=b.find(a=>"day"===a.type)?.value??"01";return`${c}-${d}-${e}`}function o(a,b){return`${a}${b}`}},31643:(a,b,c)=>{function d(a){return a.replace(/\/+$/,"")}c.d(b,{kY:()=>f,oO:()=>e});let e=d("http://localhost:3000"),f=d(process.env.NEXT_PUBLIC_ADMIN_URL??"https://mechi.lokimax.top");new URL(f).host.toLowerCase()},68681:(a,b,c)=>{let d;c.d(b,{$Y:()=>u,$h:()=>w,AZ:()=>q,FM:()=>z,I8:()=>o,J1:()=>p,PJ:()=>t,Sm:()=>y,Yx:()=>v,ZP:()=>x,mH:()=>A,rT:()=>r,ug:()=>s,v4:()=>n});var e=c(14857),f=c(93699),g=c(28420),h=c(31643);let i=process.env.RESEND_FROM_EMAIL??"noreply@mechi.club",j=`Mechi <${i}>`;async function k(a){let b=function(){if(void 0!==d)return d;let a=process.env.RESEND_API_KEY?.trim();return d=a?new e.u(a):null}();b?await b.emails.send(a):console.warn("[Email] Send skipped - RESEND_API_KEY is not configured")}async function l(a){if(0!==a.bcc.length)try{await k({from:j,to:i,bcc:a.bcc,subject:a.subject,html:m(a.title,a.content)})}catch(b){console.error(`[Email] ${a.title} broadcast send error:`,b)}}function m(a,b){return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${a}</title>
  <style>
    body { margin: 0; padding: 0; background: #eef3f7; font-family: 'Segoe UI', Arial, sans-serif; color: #0B1121; }
    .wrapper { max-width: 620px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #ffffff; border: 1px solid #d7e1ea; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px rgba(11, 17, 33, 0.08); }
    .header { background: linear-gradient(135deg, #0B1121 0%, #152033 58%, #FF6B6B 100%); padding: 36px 32px; }
    .brand { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.04em; margin: 0; }
    .tagline { color: rgba(255,255,255,0.7); margin: 10px 0 0; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
    .body { padding: 32px; }
    .body h2 { color: #0B1121; margin: 0 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
    .body p { color: #435066; line-height: 1.7; margin: 0 0 16px; font-size: 14px; }
    .info-box { background: #f8fbfd; border: 1px solid #d7e1ea; border-radius: 18px; padding: 20px; margin: 22px 0; }
    .info-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e3ebf2; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #5f6d82; font-size: 13px; }
    .info-value { color: #0B1121; font-size: 13px; font-weight: 700; text-align: right; }
    .btn { display: inline-block; background: #FF6B6B; color: #0B1121 !important; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 800; font-size: 14px; margin-top: 8px; }
    .footer { padding: 22px 32px 28px; border-top: 1px solid #e3ebf2; text-align: center; }
    .footer p { color: #5f6d82; font-size: 12px; margin: 0; line-height: 1.6; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
    .badge-win { background: rgba(50,224,196,0.16); color: #148a77; }
    .badge-loss { background: rgba(255,107,107,0.12); color: #c94a4a; }
    .badge-red { background: rgba(255,107,107,0.12); color: #c94a4a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="brand">MECHI</p>
        <p class="tagline">Compete. Connect. Rise.</p>
      </div>
      <div class="body">
        ${b}
      </div>
      <div class="footer">
        <p>mechi.club</p>
        <p>You are receiving this email because you have an account on Mechi.</p>
      </div>
    </div>
  </div>
</body>
</html>`}async function n(a){let b=(0,g.MI)(f.MS),c=`
    <h2>Welcome, ${a.username}</h2>
    <p>Your Mechi profile is live. Pick your focus games, lock in your setup, and start climbing through clean competitive matches.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Starting Rank</span>
        <span class="info-value">${b.label}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level</span>
        <span class="info-value">Lv. 1</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">mechi.club</span>
      </div>
    </div>
    <p>Head to your dashboard, finish setup, and get into your first queue.</p>
    <a href="${h.oO}/dashboard" class="btn">Open Dashboard</a>
  `;try{await k({from:j,to:a.to,subject:`Welcome to Mechi, ${a.username}!`,html:m(`Welcome to Mechi, ${a.username}!`,c)})}catch(a){console.error("[Email] Welcome send error:",a)}}async function o(a){let b=a.username?.trim()||"there",c=`
    <h2>Sign in to Mechi</h2>
    <p>Hey ${b}, use this secure link to open your account without typing your password.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Link expires in</span>
        <span class="info-value">${a.expiresInMinutes} minutes</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested for</span>
        <span class="info-value">${a.to}</span>
      </div>
    </div>
    <p>If you did not request this, you can ignore the email. Your password stays unchanged.</p>
    <a href="${a.magicLink}" class="btn">Sign in to Mechi</a>
  `;try{await k({from:j,to:a.to,subject:"Your Mechi sign-in link",html:m("Sign in to Mechi",c)})}catch(a){console.error("[Email] Magic link send error:",a)}}async function p(a){let b=a.username?.trim()||"there",c=`
    <h2>Reset your password</h2>
    <p>Hey ${b}, use this secure link to set a new password for your Mechi account.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Link expires in</span>
        <span class="info-value">${a.expiresInMinutes} minutes</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested for</span>
        <span class="info-value">${a.to}</span>
      </div>
    </div>
    <p>If you did not request this, you can ignore the email and keep your current password.</p>
    <a href="${a.resetLink}" class="btn">Reset password</a>
  `;try{await k({from:j,to:a.to,subject:"Reset your Mechi password",html:m("Reset your Mechi password",c)})}catch(a){console.error("[Email] Password reset send error:",a)}}async function q(a){let b=`
    <h2>Match found</h2>
    <p>Your next Mechi match is ready. Open the match room, connect with your opponent, and finish cleanly so both profiles stay accurate.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${a.opponentUsername}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${a.platform}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent ID</span>
        <span class="info-value">${a.opponentPlatformId}</span>
      </div>
    </div>
    <p>Use the match page to coordinate, report the result, and keep the ladder moving.</p>
    <a href="${h.oO}/match/${a.matchId}" class="btn">View Match</a>
  `;try{await k({from:j,to:a.to,subject:`Match found! You vs ${a.opponentUsername}`,html:m("Match Found",b)})}catch(a){console.error("[Email] Match found send error:",a)}}async function r(a){let b=`
    <h2>${a.won?"Victory confirmed":"Match complete"}</h2>
    <p>Your match against <strong>${a.opponentUsername}</strong> is locked in. Your Mechi climb has been updated.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Result</span>
        <span class="info-value">
          <span class="badge ${a.won?"badge-win":"badge-loss"}">${a.won?"Win":"Loss"}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Current Rank</span>
        <span class="info-value">${a.rankLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level</span>
        <span class="info-value">Lv. ${a.level}</span>
      </div>
    </div>
    <a href="${h.oO}/dashboard" class="btn">Play Again</a>
  `;try{await k({from:j,to:a.to,subject:`Match result: ${a.won?"You won!":"Match complete"} / ${a.rankLabel}`,html:m("Match Result",b)})}catch(a){console.error("[Email] Result confirmed send error:",a)}}async function s(a){let b=`
    <h2>Match disputed</h2>
    <p>Your match against <strong>${a.opponentUsername}</strong> in <strong>${a.game}</strong> has been disputed.</p>
    <p>Upload a screenshot of the result on the match page so the result can be resolved cleanly.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${a.opponentUsername}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="badge badge-red">Disputed</span></span>
      </div>
    </div>
    <a href="${h.oO}/match/${a.matchId}" class="btn">Upload Screenshot</a>
  `;try{await k({from:j,to:a.to,subject:"Match disputed - upload screenshot to resolve",html:m("Match Disputed",b)})}catch(a){console.error("[Email] Dispute send error:",a)}}async function t(a){let b=a.message?`
      <div class="info-row">
        <span class="info-label">Message</span>
        <span class="info-value">${a.message}</span>
      </div>
    `:"",c=`
    <h2>Direct challenge received</h2>
    <p>Hey ${a.username}, ${a.challengerUsername} wants to run a direct match with you on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${a.platform}</span>
      </div>
      ${b}
    </div>
    <p>Open your notifications to accept, decline, or keep the challenge moving.</p>
    <a href="${a.challengeUrl}" class="btn">Review Challenge</a>
  `;try{await k({from:j,to:a.to,subject:`${a.challengerUsername} challenged you on Mechi`,html:m("Challenge Received",c)})}catch(a){console.error("[Email] Challenge received send error:",a)}}async function u(a){let b=`
    <h2>Fresh queue run available</h2>
    <p>${a.username} just joined the ${a.game} queue on ${a.platform}.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${a.platform}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Queue window</span>
        <span class="info-value">Up to ${a.queueWindowMinutes} minutes</span>
      </div>
    </div>
    <p>If you are ready to play now, join the queue before the current window closes.</p>
    <a href="${a.queueUrl}" class="btn">Open Queue</a>
  `;await l({bcc:a.bcc,subject:`${a.game}: a player is waiting right now`,title:"Queue Opportunity",content:b})}async function v(a){let b=a.scheduledFor?new Date(a.scheduledFor).toLocaleString("en-KE",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}):"ASAP",c=a.mapName?`
      <div class="info-row">
        <span class="info-label">Map</span>
        <span class="info-value">${a.mapName}</span>
      </div>
    `:"",d=`
    <h2>New lobby is open</h2>
    <p>${a.hostName} opened a new ${a.game} lobby on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Lobby</span>
        <span class="info-value">${a.lobbyTitle}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Mode</span>
        <span class="info-value">${a.mode}</span>
      </div>
      ${c}
      <div class="info-row">
        <span class="info-label">Starts</span>
        <span class="info-value">${b}</span>
      </div>
    </div>
    <p>Join the room early so the host knows the slot is taken.</p>
    <a href="${a.lobbyUrl}" class="btn">View Lobby</a>
  `;await l({bcc:a.bcc,subject:`${a.game}: ${a.lobbyTitle} is now open`,title:"Lobby Open",content:d})}async function w(a){let b=a.platform?`
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">${a.platform}</span>
      </div>
    `:"",c=`
    <h2>New tournament live</h2>
    <p>${a.organizerName} just opened ${a.tournamentTitle} on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      ${b}
      <div class="info-row">
        <span class="info-label">Bracket size</span>
        <span class="info-value">${a.size} players</span>
      </div>
      <div class="info-row">
        <span class="info-label">Entry fee</span>
        <span class="info-value">KES ${a.entryFee.toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Location</span>
        <span class="info-value">${a.region}</span>
      </div>
    </div>
    <p>Open the bracket page to join before the slots fill up.</p>
    <a href="${a.tournamentUrl}" class="btn">View Tournament</a>
  `;await l({bcc:a.bcc,subject:`${a.tournamentTitle} is open for ${a.game}`,title:"Tournament Open",content:c})}async function x(a){let b=`
    <h2>Your bracket is full</h2>
    <p>Hey ${a.organizerName}, every slot in <strong>${a.tournamentTitle}</strong> is locked.</p>
    <p>Start the tournament to create the first match rooms and get players moving.</p>
    <a href="${a.tournamentUrl}" class="btn">Start Tournament</a>
  `;try{await k({from:j,to:a.to,subject:`${a.tournamentTitle} is full - start it now`,html:m("Tournament Full",b)})}catch(a){console.error("[Email] Tournament full send error:",a)}}async function y(a){let b=`
    <h2>Your bracket match is ready</h2>
    <p>Hey ${a.playerName}, your match in <strong>${a.tournamentTitle}</strong> is live.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${a.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${a.opponentName}</span>
      </div>
    </div>
    <a href="${a.matchUrl}" class="btn">Open Match</a>
  `;try{await k({from:j,to:a.to,subject:"Your Mechi tournament match is ready",html:m("Tournament Match Ready",b)})}catch(a){console.error("[Email] Tournament match send error:",a)}}async function z(a){let b=a.prizeAmount>0?`Your prize is KES ${a.prizeAmount.toLocaleString()}. If automatic payout needs review, Mechi will keep it marked on the tournament.`:"No cash prize on this one, but the win is yours.",c=`
    <h2>Champion status locked</h2>
    <p>GG ${a.winnerName}. You won <strong>${a.tournamentTitle}</strong>.</p>
    <p>${b}</p>
    <a href="${a.tournamentUrl}" class="btn">View Bracket</a>
  `;try{await k({from:j,to:a.to,subject:`You won ${a.tournamentTitle}`,html:m("Tournament Winner",c)})}catch(a){console.error("[Email] Tournament winner send error:",a)}}async function A(a){let b="elite"===a.plan?"Elite":"Pro",c=new Date(a.expiresAt).toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"}),d=`
    <h2>${b} activated</h2>
    <p>Hey ${a.username}, your ${b} plan is live on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">${b}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Renews</span>
        <span class="info-value">${c}</span>
      </div>
    </div>
    <p>Your upgraded perks are ready now. Jump back in and keep climbing.</p>
    <a href="${h.oO}/dashboard" class="btn">Open Dashboard</a>
  `;try{await k({from:j,to:a.to,subject:`${b} activated on Mechi`,html:m(`${b} activated on Mechi`,d)})}catch(a){console.error("[Email] Subscription confirm send error:",a)}}}};