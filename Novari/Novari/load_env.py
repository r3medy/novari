"""Load Novari/.env into os.environ for local development."""

from __future__ import annotations

import os
from pathlib import Path

_PROJECT_DIR = Path(__file__).resolve().parent.parent


def load_env_file() -> None:
    """Populate os.environ from Novari/.env when vars are not already set."""
    env_path = _PROJECT_DIR / '.env'
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value
