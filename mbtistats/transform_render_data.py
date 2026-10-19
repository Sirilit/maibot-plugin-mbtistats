"""Transform analysis output into the data shape used by the renderer."""

from __future__ import annotations

from typing import Any


def transform_render_data(stats: dict[str, Any]) -> dict[str, Any]:
    """Transform the analysis payload for the HTML template."""
    del stats
    raise NotImplementedError("Port transform_render_data.py from nonebot-plugin-mbtistats")
