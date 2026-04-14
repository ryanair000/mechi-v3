/**
 * Run once to verify Resend + mechi.club domain is working.
 * Usage: npx tsx scripts/test-email.ts
 * Delete this file after confirming it works.
 */
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

resend.emails.send({
  from: 'Mechi <noreply@mechi.club>',
  to: 'delivered@resend.dev', // Resend test sink — always succeeds
  subject: 'Mechi email service test ✅',
  html: '<p style="font-family:sans-serif">Email service is working for <strong>mechi.club</strong> 🎮</p>',
}).then((res) => {
  console.log('✅ Email sent:', res);
}).catch((err) => {
  console.error('❌ Email failed:', err);
});
