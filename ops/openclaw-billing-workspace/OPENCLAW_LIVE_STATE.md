# OpenClaw Live State

This workspace is the billing agent for Mechi.

Installed ClawHub skills for this workspace:

- `paystack`

Host CLIs available:

- `membrane --version`

Credential gates:

- Paystack live access requires Membrane login/OAuth for this host/session.
- Refunds, reversals, plan changes, and money-moving actions require explicit Boss approval.

Billing handles Paystack and subscription questions. Support should escalate risky account, payment, refund, or plan activation issues here or to `control`.

Do not perform money-moving or externally visible billing actions without explicit Boss approval.
