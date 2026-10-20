"""HTML builder for the MBTI stats dashboard.

The MaiBot render capability accepts a single HTML string and loads it with
``page.set_content``. There is no virtual origin or custom ``page.route``, so
all CSS, JavaScript, chart data and images are inlined here.
"""

from __future__ import annotations

import base64
import html
import json
from pathlib import Path
from typing import Any

ASSETS_DIR = Path(__file__).parent / "assets"
TEMPLATE_DIR = ASSETS_DIR / "template" / "mbti-stats"
IMAGE_DIR = ASSETS_DIR / "images"

_HTML_TEMPLATE = (TEMPLATE_DIR / "index.html").read_text(encoding="utf-8")
_STYLES = (TEMPLATE_DIR / "styles.css").read_text(encoding="utf-8")
_ECHARTS_JS = (TEMPLATE_DIR / "echarts.min.js").read_text(encoding="utf-8")
_DASHBOARD_JS = (TEMPLATE_DIR / "dashboard.bundle.js").read_text(encoding="utf-8")

_IMAGE_MAP_CACHE: dict[str, str] | None = None


def _image_map() -> dict[str, str]:
    """Return ``{MBTI type: data URI}`` for bundled personality images."""
    global _IMAGE_MAP_CACHE
    if _IMAGE_MAP_CACHE is None:
        images: dict[str, str] = {}
        for path in sorted(IMAGE_DIR.glob("*.png")):
            data = base64.b64encode(path.read_bytes()).decode("ascii")
            images[path.stem.upper()] = f"data:image/png;base64,{data}"
        _IMAGE_MAP_CACHE = images
    return _IMAGE_MAP_CACHE


def build_html(render_data: dict[str, Any]) -> str:
    """Build a self-contained dashboard HTML document.

    ``render_data`` is the output of
    :func:`mbtistats.transform_render_data.transform_to_render_data`.
    """
    data_payload = {
        "typeRawData": render_data.get("type_data") or [],
        "traitRawData": render_data.get("trait_data") or {},
        "typeHistoryData": render_data.get("type_history_data") or [],
        "traitHistoryData": render_data.get("trait_history_data") or [],
    }
    data_json = json.dumps(data_payload, ensure_ascii=False, separators=(",", ":"))
    # A literal </script> inside JSON would terminate the script block early.
    data_json = data_json.replace("</", "<\\/")
    image_json = json.dumps(_image_map(), ensure_ascii=False, separators=(",", ":"))
    image_json = image_json.replace("</", "<\\/")

    return (
        _HTML_TEMPLATE.replace("__STYLE__", _STYLES)
        .replace("__ECHARTS_JS__", _ECHARTS_JS)
        .replace("__DASHBOARD_JS__", _DASHBOARD_JS)
        .replace("__IMAGE_MAP__", image_json)
        .replace("__DATA_JSON__", data_json)
        .replace("__TITLE__", html.escape(str(render_data.get("title") or "MBTI 类型与特质分布统计")))
        .replace("__GROUP_NAME__", html.escape(str(render_data.get("group_name") or "未知群名称")))
        .replace("__TOTAL_COUNT__", str(int(render_data.get("total_count") or 0)))
    )
