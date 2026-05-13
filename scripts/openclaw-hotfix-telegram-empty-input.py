#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


MARKER = "telegram: dropping empty inbound body for chat"
NEEDLE = "if (!bodyResult) return null;\n"
INSERT = (
    "if (!bodyResult) return null;\n"
    '\tconst resolvedBodyText = typeof bodyResult.bodyText === "string" ? bodyResult.bodyText.trim() : "";\n'
    "\tif (!resolvedBodyText) {\n"
    '\t\tlogVerbose(`telegram: dropping empty inbound body for chat ${chatId}`);\n'
    "\t\treturn null;\n"
    "\t}\n"
)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: openclaw-hotfix-telegram-empty-input.py <bot-msflwCEW.js>", file=sys.stderr)
        return 1

    target = Path(sys.argv[1])
    if not target.exists():
        print(f"target not found: {target}", file=sys.stderr)
        return 1

    original = target.read_text(encoding="utf-8")
    if MARKER in original:
        print(f"already patched: {target}")
        return 0

    if NEEDLE not in original:
        print(f"patch anchor not found in: {target}", file=sys.stderr)
        return 1

    updated = original.replace(NEEDLE, INSERT, 1)
    backup = target.with_name(f"{target.name}.bak-telegram-empty-input")
    backup.write_text(original, encoding="utf-8")
    target.write_text(updated, encoding="utf-8")
    print(f"patched: {target}")
    print(f"backup: {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
