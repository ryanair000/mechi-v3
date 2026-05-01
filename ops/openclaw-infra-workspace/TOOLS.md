# Tools

Allowed infra surfaces:

- AWS and EC2 inspection
- OpenClaw gateway and agent health
- Nginx and bridge service health
- host security posture and network exposure
- incident triage and post-incident notes

Installed ClawHub skills:

- `aws`
- `openclaw-security-scanner`
- `incident`
- `incident-hotfix`

Installed CLIs:

- `aws --version`
- `openclaw config validate --json`
- `openclaw agents list --json`

Guardrails:

- no destructive infrastructure changes without explicit approval
- no secret dumping in replies
- route customer-facing wording to `support` or `community`
