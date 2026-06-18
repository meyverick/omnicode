#!/usr/bin/env python3
"""Expand model families from models.json into ordered provider fallbacks.

Usage:
  scripts/order-model-family.py default deepseek-v4-flash, glm-5.2
  scripts/order-model-family.py critical "deepseek-v4-flash,glm-5.2"
  scripts/order-model-family.py --json default glm-5.2

Modes preserve input family order and expand each family in-place:
  default  = free providers, paid providers, opencode-go
  critical = paid providers, opencode-go, free providers
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

FREE_MODELS = {
    "opencode/big-pickle",
    "opencode/deepseek-v4-flash-free",
    "opencode/gemini-3-flash",
    "opencode/gemini-3.1-pro",
    "opencode/gemini-3.5-flash",
    "opencode/mimo-v2.5-free",
    "opencode/nemotron-3-ultra-free",
    "opencode/north-mini-code-free",
}

FREE_PROVIDERS = {
    "deepseek",
    "huggingface",
    "mistral",
    "nvidia",
    "ollama-cloud",
    "openrouter",
}

OPENCODE_GO = "opencode-go"


def provider(model_id: str) -> str:
    return model_id.split("/", 1)[0]


def is_free(model_id: str) -> bool:
    return model_id.endswith(":free") or model_id.endswith("-free") or model_id in FREE_MODELS or provider(model_id) in FREE_PROVIDERS


def load_models() -> dict[str, list[str]]:
    script_dir = Path(__file__).resolve().parent
    candidates = [Path.cwd() / "models.json", script_dir.parent / "models.json"]
    for candidate in candidates:
        if candidate.exists():
            return json.loads(candidate.read_text())
    raise SystemExit("models.json not found in cwd or script parent")


def parse_families(raw: list[str]) -> list[str]:
    families: list[str] = []
    for chunk in raw:
        families.extend(part.strip() for part in chunk.split(",") if part.strip())
    if not families:
        raise SystemExit("Provide at least one model family")
    return families


def resolve_family(name: str, models: dict[str, list[str]], model_to_family: dict[str, str]) -> str:
    if name in models:
        return name
    if name in model_to_family:
        return model_to_family[name]
    raise SystemExit(f"Unknown model family or id: {name}")


def ordered_family(model_ids: list[str], mode: str) -> list[str]:
    free = [model_id for model_id in model_ids if is_free(model_id) and provider(model_id) != OPENCODE_GO]
    paid = [model_id for model_id in model_ids if not is_free(model_id) and provider(model_id) != OPENCODE_GO]
    opencode_go = [model_id for model_id in model_ids if provider(model_id) == OPENCODE_GO]

    if mode == "default":
        ordered = [*free, *paid, *opencode_go]
    else:
        ordered = [*paid, *opencode_go, *free]

    deduped: list[str] = []
    seen: set[str] = set()
    for model_id in ordered:
        if model_id not in seen:
            deduped.append(model_id)
            seen.add(model_id)
    return deduped


def main() -> int:
    parser = argparse.ArgumentParser(description="Expand models.json families into ordered provider fallbacks")
    parser.add_argument("--json", action="store_true", help="print JSON array instead of comma-separated IDs")
    parser.add_argument("mode", choices=("default", "critical"))
    parser.add_argument("families", nargs="+", help="comma-separated model families or model IDs")
    args = parser.parse_args()

    models = load_models()
    model_to_family = {model_id: family for family, ids in models.items() for model_id in ids}
    result: list[str] = []
    seen: set[str] = set()

    for raw_family in parse_families(args.families):
        family = resolve_family(raw_family, models, model_to_family)
        for model_id in ordered_family(models[family], args.mode):
            if model_id not in seen:
                result.append(model_id)
                seen.add(model_id)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(", ".join(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
