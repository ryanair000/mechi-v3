#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) not in {6, 7}:
        print(
            "usage: openclaw-smm-only-config.py <openclaw_home> <socio_workspace> <socio_model> <group_id> <topic_id> [allow_from_csv]",
            file=sys.stderr,
        )
        return 1

    openclaw_home, socio_workspace, socio_model, group_id, topic_id = sys.argv[1:6]
    allow_from_csv = sys.argv[6] if len(sys.argv) == 7 else "6806783421,6738706706"
    config_path = Path(openclaw_home) / "openclaw.json"
    config = json.loads(config_path.read_text())

    allowed_ids = [entry.strip() for entry in allow_from_csv.split(",") if entry.strip()]
    allowed_ints = [int(entry) for entry in allowed_ids if entry.lstrip("-").isdigit()]

    group_prompt = " ".join(
        [
            "This is OPS, the Boss private Mechi Telegram SMM room.",
            "This runtime is intentionally trimmed to SMM plus Boss admin DM control.",
            "Use the socio agent for Mechi social publishing and social media operations.",
            "Read MECHI_SOCIAL_PLAYBOOK.md before drafting or publishing.",
            "When the Boss sends a photo or video here without naming channels, treat it as approval to publish on Instagram only.",
            "If the Boss says socio post chezahub, publish to both Instagram and Facebook for the ChezaHub brand pair.",
            "If the Boss says socio post playmechi, publish to both Instagram and Facebook for the PlayMechi brand pair.",
            "If the Boss says socio post mechi or post mechi, treat Mechi as PlayMechi and publish to Instagram and Facebook for PlayMechi.",
            "If the Boss says socio instagram, socio facebook, socio x, socio instagram/facebook, or socio all, use those exact channel targets for the named brand.",
            "If the Boss says socio ping, socio test, or socio help, do not publish anything and return only a short readiness or command summary.",
            "If the Boss asks to schedule a post, use the local mechi-social-exec scheduler immediately and reply with the queued job id, exact EAT time, target channels, and caption used.",
            "If the Boss names Facebook, X, Discord, or says post all, publish to those named channels too.",
            "For explicit chezahub or playmechi commands, use the local mechi-social-exec publish-meta helpers so the publish target is deterministic.",
            "Use instagram-content-studio or instagram-api for Instagram-only publishing when the brand is already clear.",
            "Use the local mechi-social-exec skill for Mechi-specific caption shaping, Facebook publishing, Discord webhook posting, X readiness checks, and cross-channel reporting.",
            "If the message includes a caption, keep the Boss intent and clean it lightly. If there is no caption, draft a Mechi-ready caption from the media, filename, command, and context without inventing facts.",
            "Do not ask the Boss to confirm a caption for explicit post or schedule commands. Execute first, then report the caption that was used.",
            "If the brand is ambiguous between ChezaHub and PlayMechi, ask one short clarification before publishing.",
            "Reply after publish with the target channels plus the permalink, post id, or skip reason for each channel.",
            "Do not touch ad spend, unrelated campaigns, or customer account actions from this room.",
        ]
    )

    topic_prompt = " ".join(
        [
            "This is the SMM topic in the Boss private OPS Telegram room.",
            "Use the socio agent for Mechi social execution.",
            "Read MECHI_SOCIAL_PLAYBOOK.md before drafting or publishing.",
            "If the Boss says socio post chezahub, publish to both Instagram and Facebook for the ChezaHub brand pair.",
            "If the Boss says socio post playmechi, publish to both Instagram and Facebook for the PlayMechi brand pair.",
            "If the Boss says socio post mechi or post mechi, treat Mechi as PlayMechi and publish to Instagram and Facebook for PlayMechi.",
            "If the Boss says socio instagram, socio facebook, socio x, socio instagram/facebook, or socio all, use those exact channel targets for the named brand.",
            "If the Boss says socio ping, socio test, or socio help, do not publish anything and return only a short readiness or command summary.",
            "If the Boss asks to schedule a post, use the local mechi-social-exec scheduler immediately and reply with the queued job id, exact EAT time, target channels, and caption used.",
            "When the Boss drops a photo or video here without naming a brand, do not assume PlayMechi or ChezaHub blindly. Infer from the asset and CTA, and ask one short clarification if it is still ambiguous.",
            "Use the message caption when present. Improve grammar lightly only when needed and keep the Boss intent.",
            "Do not ask the Boss to confirm a caption for explicit post or schedule commands. Execute first, then report the caption that was used.",
            "Use mechi-social-exec for caption shaping and cross-channel execution, especially the local publish-meta helpers for explicit chezahub or playmechi commands.",
        ]
    )

    config.setdefault("agents", {})
    defaults = config["agents"].get("defaults") or {}
    defaults["workspace"] = socio_workspace
    defaults["repoRoot"] = defaults.get("repoRoot") or "/home/ubuntu/mechi-v3"
    defaults["thinkingDefault"] = "low"
    defaults["timeoutSeconds"] = 120
    config["agents"]["defaults"] = defaults
    control_workspace = "/home/ubuntu/mechi-v3"
    config["agents"]["list"] = [
        {
            "id": "control",
            "name": "Mechi Control",
            "workspace": control_workspace,
            "model": socio_model,
            "thinkingDefault": "low",
            "fastModeDefault": False,
            "tools": {"profile": "coding"},
        },
        {
            "id": "socio",
            "name": "Mechi Socio",
            "workspace": socio_workspace,
            "model": socio_model,
            "thinkingDefault": "low",
            "fastModeDefault": True,
            "tools": {"profile": "coding"},
        }
    ]

    config.setdefault("channels", {})
    telegram = config["channels"].get("telegram") or {}
    telegram["enabled"] = True
    telegram["dmPolicy"] = "allowlist"
    telegram["allowFrom"] = allowed_ids
    telegram["dms"] = {chat_id: {"historyLimit": 80} for chat_id in allowed_ids}
    telegram["groupPolicy"] = "allowlist"
    telegram["streaming"] = {"mode": "off"}
    telegram["replyToMode"] = "first"
    telegram["timeoutSeconds"] = 120
    telegram["groups"] = {
        group_id: {
            "enabled": True,
            "groupPolicy": "open",
            "requireMention": False,
            "allowFrom": allowed_ints,
            "systemPrompt": group_prompt,
            "topics": {
                topic_id: {
                    "enabled": True,
                    "agentId": "socio",
                    "requireMention": False,
                    "allowFrom": allowed_ints,
                    "systemPrompt": topic_prompt,
                }
            },
        }
    }
    config["channels"]["telegram"] = telegram
    config["channels"].pop("whatsapp", None)

    config["bindings"] = [
        {
            "type": "route",
            "agentId": "socio",
            "comment": "Boss private OPS Telegram SMM room -> socio",
            "match": {"channel": "telegram", "peer": {"kind": "group", "id": group_id}},
        },
        *[
            {
                "type": "route",
                "agentId": "control",
                "comment": "Approved Boss/admin Telegram DM -> control coding agent",
                "match": {"channel": "telegram", "peer": {"kind": "direct", "id": chat_id}},
            }
            for chat_id in allowed_ids
        ],
    ]

    config.setdefault("plugins", {})
    entries = config["plugins"].get("entries") or {}
    entries["openai"] = {"enabled": True}
    entries["telegram"] = {"enabled": True}
    entries["whatsapp"] = {"enabled": False}
    config["plugins"]["entries"] = entries

    config_path.write_text(json.dumps(config, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
