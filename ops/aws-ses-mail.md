# AWS SES Mail Setup

Use Amazon SES for outbound app mail instead of running a raw SMTP server on EC2. EC2 can still host the app, but SES should handle delivery reputation, DKIM signing, bounces, complaints, and sending quotas.

## AWS Setup

1. In Amazon SES, verify `mechi.club` as a domain identity in the AWS Region you will send from.
2. Add the SES DNS records for DKIM. Keep SPF and DMARC configured for the domain.
3. Request SES production access. New SES accounts start in sandbox mode, where recipients must be verified and sending is capped.
4. Attach an IAM role to the EC2 instance, or create an IAM user, with permission to call `ses:SendEmail` for your verified identity.
5. On EC2, prefer the SES HTTPS API path used by this app. If you later relay SMTP directly, use ports `587`, `465`, `2587`, or `2465`; port `25` is throttled on EC2 by default.

Current `us-east-2` status from the smoke test:

- SES account: healthy, sending enabled
- Production access: `false` (sandbox); AWS case `177798277100797` is currently `DENIED`
- `mechi.club` identity: verified successfully, sending enabled

Add these DKIM records for the current `mechi.club` SES identity:

```text
tzod3vdt7geczlyywyt3iniwrfjv55sm._domainkey.mechi.club CNAME tzod3vdt7geczlyywyt3iniwrfjv55sm.dkim.amazonses.com
6yfbnla753qupwttm4aqmq2ex5jshwcy._domainkey.mechi.club CNAME 6yfbnla753qupwttm4aqmq2ex5jshwcy.dkim.amazonses.com
sayfa5qkwyp34zm3w5iob4vmpoafz734._domainkey.mechi.club CNAME sayfa5qkwyp34zm3w5iob4vmpoafz734.dkim.amazonses.com
```

Minimum IAM policy shape:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "*"
    }
  ]
}
```

## App Environment

Set these on the server:

```bash
AWS_SES_REGION=us-east-2
AWS_SES_FROM_EMAIL=noreply@mechi.club
EMAIL_UNSUBSCRIBE_SECRET=...
```

If the EC2 instance has an IAM role attached, also set:

```bash
AWS_SES_USE_INSTANCE_ROLE=true
```

If you are not using an EC2 role, set access keys instead:

```bash
AWS_SES_ACCESS_KEY_ID=...
AWS_SES_SECRET_ACCESS_KEY=...
```

Optional:

```bash
AWS_SES_CONFIGURATION_SET=mechi-production
AWS_SES_FEEDBACK_EMAIL=bounces@mechi.club
AWS_SES_ENDPOINT_URL=https://email.us-east-2.amazonaws.com/v2/email/outbound-emails
EMAIL_FROM_ADDRESS=noreply@mechi.club
ADMIN_EMAIL_SEND_LIMIT=200
```

## CLI Smoke Test

Check AWS/SES account access:

```bash
npm run ops:ses:smoke -- --region us-east-2 --no-send
```

Send one test email:

```bash
npm run ops:ses:smoke -- --region us-east-2 --from noreply@mechi.club --to you@example.com
```

Create the SES domain identity and print DKIM DNS records:

```bash
npm run ops:ses:smoke -- --region us-east-2 --create-domain mechi.club --no-send
```

Request or update production-access details:

```bash
npm run ops:ses:smoke -- --region us-east-2 --request-production-access --no-send
```

## Notes

- Remove old third-party mail-provider variables from production once SES is live.
- If `package.json` is restored in this workspace, remove any unused third-party mail dependency entry.
- For bulk client mail, keep using `/admin/email`; it filters unsubscribes and sends one recipient per SES request.
