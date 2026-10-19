"""Render helpers.

In MaiBot, prefer ctx.render.html2png() over driving Playwright yourself.
This module should build the HTML string; the plugin sends the PNG.
"""

from __future__ import annotations

from typing import Any


def build_html(stats: dict[str, Any]) -> str:
    """Build the HTML document for the MBTI stats chart."""
    del stats
    raise NotImplementedError("Port render.py from nonebot-plugin-mbtistats")
