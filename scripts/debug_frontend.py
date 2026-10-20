"""Render the MBTI dashboard to ``debug/preview.html`` for browser preview.

This uses the exact same ``build_html`` function as the plugin runtime, so what
you see in the browser is what ``ctx.render.html2png`` will capture.

Usage::

    python scripts/debug_frontend.py
    python -m http.server 8821 --directory debug
    # open http://127.0.0.1:8821/preview.html

The optional ``--group`` argument selects a different group snapshot from
``debug/data/<group_id>.json`` or the bundled seed data.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from mbtistats.render import build_html  # noqa: E402
from mbtistats.transform_render_data import transform_to_render_data  # noqa: E402


def _resolve_data_path(group_id: str, data_file: str | None) -> Path:
    if data_file:
        return Path(data_file).resolve()
    candidates = [
        ROOT / "debug" / "data" / f"{group_id}.json",
        ROOT / "mbtistats" / "assets" / "data" / "v1" / group_id / "stats-data.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"找不到群 {group_id} 的数据，请把 stats-data.json 放到 {candidates[0]}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="生成 MBTI 统计图的浏览器预览。")
    parser.add_argument("--group", default="639990875", help="群号")
    parser.add_argument("--data", default=None, help="直接指定 stats-data.json")
    parser.add_argument("--out", default=None, help="输出 HTML 路径")
    args = parser.parse_args()

    data_path = _resolve_data_path(args.group, args.data)
    history = json.loads(data_path.read_text(encoding="utf-8"))
    if not history:
        raise SystemExit(f"数据为空: {data_path}")

    latest = history[-1]
    group_name = str(latest.get("group_name") or f"群聊{args.group}")
    total_count = int(latest.get("total_count") or 0)

    render_data = transform_to_render_data(
        history_data=history,
        title="MBTI 类型与特质分布统计",
        group_name=group_name,
        total_count=total_count,
    )
    html = build_html(render_data)

    output_path = Path(args.out) if args.out else ROOT / "debug" / "preview.html"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    print(f"数据: {data_path}")
    print(f"历史记录: {len(history)} 条")
    print(f"输出: {output_path}")
    print("预览: python -m http.server 8821 --directory debug")
    print("      http://127.0.0.1:8821/preview.html")


if __name__ == "__main__":
    main()
