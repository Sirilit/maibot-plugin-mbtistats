"""Analysis layer, to be ported from the NoneBot plugin."""

from __future__ import annotations

from typing import Any


def analyze_members(members: list[dict[str, Any]]) -> dict[str, Any]:
    """Analyze group members and return the stats payload."""
    del members
    raise NotImplementedError("Port analyze.py from nonebot-plugin-mbtistats")
