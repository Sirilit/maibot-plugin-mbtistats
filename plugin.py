"""MaiBot MBTI Stats plugin.

The plugin exposes one AI tool.  It fetches the current group roster through the
SnowLuma/NapCat adapter, updates the per-group historical snapshot, renders the
ECharts dashboard in the host browser, and returns the image as a tool content
item for the AI to send.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import shutil
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from maibot_sdk import CONFIG_RELOAD_SCOPE_SELF, Command, MaiBotPlugin, Tool
from maibot_sdk.types import ToolParameterInfo, ToolParamType

from .mbtistats.analyze import analyze_trait_stats, analyze_type_stats
from .mbtistats.config import MBTISTatsConfig
from .mbtistats.render import build_html
from .mbtistats.transform_render_data import transform_to_render_data


_ANNOUNCEMENT_HEADER = "\n".join(
    (
        "「MBTI 计数菌 - 群聊统计插件」",
        "GitHub：https://github.com/Sirilit/maibot-plugin-mbtistats",
        "开发者：Sirilit（识启）、AllayFocalors（玛画疼）",
    )
)
_ANNOUNCEMENT_SENDER = "小面包"


class MBTIStatsPlugin(MaiBotPlugin):
    """MBTI group statistics plugin."""

    config_model = MBTISTatsConfig

    def __init__(self) -> None:
        super().__init__()
        self._render_lock: asyncio.Lock | None = None
        self._inflight: dict[str, asyncio.Task[dict[str, Any]]] = {}
        self._daily_task: asyncio.Task[None] | None = None

    async def on_load(self) -> None:
        self._render_lock = asyncio.Lock()
        self._inflight = {}
        self._seed_data()
        self._daily_task = asyncio.create_task(self._daily_loop())
        self.ctx.logger.info("mbtistats plugin loaded")

    async def on_unload(self) -> None:
        if self._daily_task is not None:
            self._daily_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._daily_task
            self._daily_task = None
        for task in list(self._inflight.values()):
            task.cancel()
        self._inflight.clear()
        self.ctx.logger.info("mbtistats plugin unloaded")

    async def on_config_update(
        self,
        scope: str,
        config_data: dict[str, object],
        version: str,
    ) -> None:
        if scope == CONFIG_RELOAD_SCOPE_SELF:
            self.ctx.logger.info("mbtistats config updated: version=%s", version)
        del config_data

    # ------------------------------------------------------------------
    # Tool / command
    # ------------------------------------------------------------------

    @Tool(
        "mbti_stats",
        description=(
            "统计当前群的 MBTI 类型与特质分布，并生成包含历史趋势的图表。"
            "当用户想了解群里的 MBTI 分布时调用。"
            "成功时 content_items 里有一张 PNG 图表，回复时可以附上。"
            "如果返回 busy=true，说明当前已有统计在渲染，不要编造数据；"
            "可以告诉用户稍后再试，或稍后重新调用。"
        ),
        parameters=[
            ToolParameterInfo(
                name="stream_id",
                param_type=ToolParamType.STRING,
                description="当前聊天流 ID",
                required=True,
            ),
        ],
    )
    async def mbti_stats(self, stream_id: str, **kwargs: Any) -> dict[str, Any]:
        """Return statistics as text plus an image content item."""
        if not self.config.plugin.enabled:
            return {"success": False, "message": "MBTI 统计插件已禁用。"}

        group_id = str(kwargs.get("group_id") or "").strip()
        platform = str(kwargs.get("platform") or "qq").strip() or "qq"
        if not group_id:
            return {"success": False, "message": "没有拿到 group_id，无法统计。"}

        result = await self._get_stats(group_id=group_id, stream_id=stream_id, platform=platform)
        if result.get("busy"):
            return {
                "success": False,
                "busy": True,
                "message": str(result.get("message") or "当前已有统计在渲染，请稍后再试。"),
            }
        if not result.get("success"):
            return {"success": False, "message": str(result.get("message") or "MBTI 统计失败。")}

        return {
            "success": True,
            "content": str(result.get("summary") or "MBTI 统计完成。"),
            "content_items": [
                {
                    "content_type": "image",
                    "data": result["image_base64"],
                    "mime_type": "image/png",
                    "name": "mbti-stats.png",
                }
            ],
        }

    @Tool(
        "send_announcement",
        description=(
            "把项目公告以合并转发消息发到当前聊天。"
            "每日统计发完图后调用；群友问项目地址、作者或美术合作时也可以调用。"
            "公告内容固定，不需要你改写，也不要在调用后再复述一遍。"
        ),
        parameters=[],
        core_tool=True,
    )
    async def send_announcement(self, **kwargs: Any) -> dict[str, Any]:
        """Send the fixed project announcement as one merged-forward message."""
        if not self.config.announcement.enabled:
            return {"success": False, "message": "项目公告当前未启用。"}
        stream_id = str(kwargs.get("stream_id") or "").strip()
        if not stream_id:
            return {"success": False, "message": "没有拿到当前聊天流，无法发送公告。"}
        bodies = self._announcement_nodes()
        if not bodies:
            return {"success": False, "message": "公告正文为空。"}
        messages = [
            {
                "user_id": "",
                "nickname": _ANNOUNCEMENT_SENDER,
                "message_id": f"mbti_announcement_{index}",
                "content": [{"type": "text", "content": body}],
            }
            for index, body in enumerate(bodies)
        ]
        try:
            result = await self.ctx.send.forward(
                messages,
                stream_id,
                return_details=True,
                sync_to_maisaka_history=True,
            )
        except Exception:
            self.ctx.logger.exception("发送项目公告失败: stream_id=%s", stream_id)
            result = None
        if result is True or (
            isinstance(result, dict)
            and bool(result.get("sent", result.get("success", False)))
        ):
            # SDK 的 send.forward 详细结果只有 sent/message_id，没有 success。
            return {"success": True, "content": "项目公告已发送。"}
        self.ctx.logger.warning("合并转发公告未成功，改用文本发送: %s", result)
        try:
            fallback_sent = await self.ctx.send.text(
                self._announcement_text(),
                stream_id,
                sync_to_maisaka_history=True,
            )
        except Exception:
            self.ctx.logger.exception("文本兜底发送公告失败: stream_id=%s", stream_id)
            return {"success": False, "message": "发送公告失败，请稍后再试。"}
        if fallback_sent is False:
            return {"success": False, "message": "发送公告失败，请稍后再试。"}
        return {"success": True, "content": "项目公告已发送（合并转发不可用，已改用文本）。"}

    def _announcement_text(self) -> str:
        """Full announcement text, used as a fallback when forward fails."""
        extra = str(self.config.announcement.extra or "").strip()
        return "\n\n".join(part for part in (_ANNOUNCEMENT_HEADER, extra) if part)

    def _announcement_nodes(self) -> list[str]:
        """Header plus one node per blank-line-separated paragraph of ``extra``."""
        extra = str(self.config.announcement.extra or "").strip()
        if not extra:
            return []
        return [
            _ANNOUNCEMENT_HEADER,
            *[part.strip() for part in extra.split("\n\n") if part.strip()],
        ]

    def _announcement_instruction(self) -> str:
        """Prompt fragment that makes the AI call the fixed announcement tool."""
        if not self.config.announcement.enabled:
            return ""
        return (
            "发完统计图后，调用 send_announcement 工具，把项目公告以合并转发发到群里。"
            "公告内容固定，不要改写，也不要在调用后再复述一遍。"
        )

    @Command("mbti", pattern=r"^/mbti(?:\s|$)")
    async def mbti_command(self, **kwargs: Any):
        """Pure reminder: ask the AI to call ``mbti_stats`` itself."""
        stream_id = str(kwargs.get("stream_id") or "").strip()
        group_id = str(kwargs.get("group_id") or "").strip()
        if not stream_id:
            return False, None, 0
        if not self.config.plugin.enabled:
            return True, None, 2

        try:
            result = await self.ctx.maisaka.proactive.trigger(
                stream_id=stream_id,
                intent=(
                    "用户刚刚发送了 /mbti。请调用 mbti_stats 工具统计本群 MBTI 分布，"
                    "并按你的判断回复；不要凭空编造统计结果。"
                    f"{self._announcement_instruction()}"
                ),
                reason="mbti_command",
                metadata={"group_id": group_id, "source": "mbtistats"},
            )
        except Exception:
            self.ctx.logger.exception("/mbti 提醒 AI 失败")
            return False, None, 0

        if not isinstance(result, dict) or not result.get("success", False):
            self.ctx.logger.warning("/mbti 提醒 AI 未成功: %s", result)
            # Let the normal message chain handle /mbti if the reminder failed.
            return True, None, 0
        return True, None, 2

    @Command("mbti_debug", pattern=r"^/mbti[-_]debug(?:\s|$)")
    async def mbti_debug_command(self, **kwargs: Any):
        """Deterministic debug fallback: render and send directly."""
        stream_id = str(kwargs.get("stream_id") or "").strip()
        group_id = str(kwargs.get("group_id") or "").strip()
        if not self.config.debug.enabled:
            self.ctx.logger.info("/mbti-debug 已收到，但 debug.enabled=false，忽略")
            return True, None, 2
        if not stream_id or not group_id:
            return False, None, 0
        if not self.config.plugin.enabled:
            return True, None, 2

        result = await self._get_stats(group_id=group_id, stream_id=stream_id, platform="qq")
        if result.get("busy"):
            await self.ctx.send.text(str(result.get("message") or "当前已有统计在渲染。"), stream_id)
            return True, None, 2
        if not result.get("success"):
            await self.ctx.send.text(f"❌ {result.get('message') or 'MBTI 统计失败。'}", stream_id)
            return True, None, 2

        await self.ctx.send.image(result["image_base64"], stream_id)
        await self._append_ai_context(
            stream_id,
            f"/mbti-debug 已执行，图表已直接发送。{result.get('summary') or ''}",
            source_kind="plugin:mbtistats:debug",
        )
        return True, None, 2

    async def _append_ai_context(self, stream_id: str, text: str, *, source_kind: str) -> None:
        """Record a plugin event in Maisaka context so the AI knows it happened."""
        try:
            result = await self.ctx.maisaka.context.append(
                stream_id=stream_id,
                segments=[{"type": "text", "content": text}],
                visible_text=text,
                source_kind=source_kind,
            )
        except Exception:
            self.ctx.logger.exception("写入 Maisaka 上下文失败: %s", text)
            return
        if not isinstance(result, dict) or not result.get("success", False):
            self.ctx.logger.warning("写入 Maisaka 上下文未成功: %s", result)

    # ------------------------------------------------------------------
    # Stats pipeline
    # ------------------------------------------------------------------

    async def _get_stats(
        self,
        *,
        group_id: str,
        stream_id: str,
        platform: str,
    ) -> dict[str, Any]:
        """Single-flight per group: duplicate calls share one task."""
        task = self._inflight.get(group_id)
        if task is None:
            task = asyncio.create_task(
                self._compute_and_render(group_id=group_id, stream_id=stream_id, platform=platform)
            )
            self._inflight[group_id] = task
            try:
                return await asyncio.shield(task)
            finally:
                if self._inflight.get(group_id) is task:
                    self._inflight.pop(group_id, None)
        return await asyncio.shield(task)

    async def _compute_and_render(
        self,
        *,
        group_id: str,
        stream_id: str,
        platform: str,
    ) -> dict[str, Any]:
        del stream_id  # the group id is enough for data and rendering

        members = await self._fetch_members(group_id)
        if not members:
            return {"success": False, "message": "未能获取到群成员列表。"}

        names = []
        for member in members:
            card = str(member.get("card") or "").strip()
            nickname = str(member.get("nickname") or "").strip()
            # Scan both fields: some groups put the MBTI code in the card and
            # some in the QQ nickname.  One combined string keeps the member
            # counted exactly once.
            combined = " ".join(part for part in (card, nickname) if part)
            if combined:
                names.append(combined)
        type_data, total_count = analyze_type_stats(names)
        if total_count <= 0:
            return {"success": False, "message": "群成员昵称里没有发现有效的 MBTI 标识。"}

        trait_data, _ = analyze_trait_stats(names)
        group_name = await self._get_group_name(group_id, platform)
        record = {
            "timestamp": int(time.time() * 1000),
            "group_name": group_name,
            "total_count": total_count,
            "type_data": type_data,
            "trait_data": trait_data,
        }
        history_data = self._append_snapshot(group_id, record)
        render_data = transform_to_render_data(
            history_data=history_data,
            title="MBTI 类型与特质分布统计",
            group_name=group_name,
            total_count=total_count,
        )
        html = build_html(render_data)

        if self._render_lock is None:
            self._render_lock = asyncio.Lock()
        acquired = False
        try:
            try:
                await asyncio.wait_for(
                    self._render_lock.acquire(),
                    timeout=max(1.0, float(self.config.render.queue_wait_seconds)),
                )
                acquired = True
            except asyncio.TimeoutError:
                return {
                    "success": False,
                    "busy": True,
                    "message": "当前已有 MBTI 统计在渲染，请稍后再试。",
                }

            result = await self.ctx.render.html2png(
                html=html,
                selector="#mbti-dashboard",
                viewport={
                    "width": int(self.config.render.viewport_width),
                    "height": int(self.config.render.viewport_height),
                },
                device_scale_factor=2.0,
                full_page=False,
                wait_until="load",
                wait_for_selector="canvas",
                wait_for_timeout_ms=1500,
                render_timeout_ms=int(self.config.render.timeout_ms),
                allow_network=False,
            )
            image_base64 = str(result.get("image_base64") or "")
            if not image_base64:
                return {"success": False, "message": "渲染完成但没有拿到图片数据。"}
        except Exception as exc:
            self.ctx.logger.exception("MBTI 图表渲染失败")
            return {"success": False, "message": f"图表渲染失败：{exc}"}
        finally:
            if acquired and self._render_lock is not None:
                self._render_lock.release()

        return {
            "success": True,
            "image_base64": image_base64,
            "summary": f"已统计「{group_name}」：{total_count} 人声明了 MBTI，历史记录 {len(history_data)} 条。",
            "group_name": group_name,
            "total_count": total_count,
        }

    async def _fetch_members(self, group_id: str) -> list[dict[str, Any]]:
        """Fetch roster through the SnowLuma/NapCat adapter API."""
        try:
            result = await self.ctx.api.call(
                "adapter.snowluma.group.get_group_member_list",
                version="1",
                group_id=group_id,
                no_cache=True,
            )
        except Exception as exc:
            self.ctx.logger.warning("获取群成员列表失败: group_id=%s error=%s", group_id, exc)
            return []

        if isinstance(result, dict):
            for key in ("members", "member_list", "list", "data"):
                candidate = result.get(key)
                if isinstance(candidate, list):
                    return [item for item in candidate if isinstance(item, dict)]
            return []
        if isinstance(result, list):
            return [item for item in result if isinstance(item, dict)]
        return []

    async def _get_group_name(self, group_id: str, platform: str) -> str:
        try:
            payload = await self.ctx.chat.get_stream_by_group_id(group_id, platform=platform)
        except Exception:
            payload = None
        stream = self._unwrap_stream(payload)
        name = str(stream.get("group_name") or "").strip()
        if name:
            return name
        return f"群聊{group_id}"

    @staticmethod
    def _unwrap_stream(payload: Any) -> dict[str, Any]:
        """Host chat APIs wrap a stream as ``{"success": True, "stream": {...}}``."""
        if not isinstance(payload, dict):
            return {}
        nested = payload.get("stream")
        if isinstance(nested, dict):
            return nested
        return payload

    # ------------------------------------------------------------------
    # Data store
    # ------------------------------------------------------------------

    def _seed_data(self) -> None:
        """Copy bundled historical data into the plugin data dir on first load."""
        source = Path(__file__).parent / "mbtistats" / "assets" / "data" / "v1"
        target = Path(self.ctx.paths.data_dir) / "v1"
        if target.exists() or not source.exists():
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, target)
        self.ctx.logger.info("MBTI 历史数据已初始化到 %s", target)

    def _data_path(self, group_id: str) -> Path:
        return Path(self.ctx.paths.data_dir) / "v1" / group_id / "stats-data.json"

    def _load_history(self, group_id: str) -> list[dict[str, Any]]:
        path = self._data_path(group_id)
        if not path.exists():
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self.ctx.logger.warning("读取 MBTI 历史数据失败: %s", path)
            return []
        return data if isinstance(data, list) else []

    def _append_snapshot(self, group_id: str, record: dict[str, Any]) -> list[dict[str, Any]]:
        """Append a snapshot when it differs from the last one."""
        history = self._load_history(group_id)
        should_append = True
        same_data = False
        if history:
            last = history[-1]
            last_compare = {key: value for key, value in last.items() if key != "timestamp"}
            current_compare = {key: value for key, value in record.items() if key != "timestamp"}
            if last_compare == current_compare:
                same_data = True
                should_append = False
            else:
                last_ts = int(last.get("timestamp") or 0)
                if last_ts and record["timestamp"] - last_ts < 60_000:
                    should_append = False
        if should_append:
            history.append(record)
            path = self._data_path(group_id)
            path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = path.with_suffix(".json.tmp")
            temp_path.write_text(
                json.dumps(history, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            temp_path.replace(path)
            return history
        if not same_data:
            # The current data changed but the 60-second write guard kept it
            # out of the historical file.  Render the current snapshot anyway
            # so the chart never shows stale numbers.
            return [*history, record]
        return history

    # ------------------------------------------------------------------
    # Daily scheduler
    # ------------------------------------------------------------------

    async def _daily_loop(self) -> None:
        while True:
            try:
                config = self.config
                if not config.daily.enabled:
                    await asyncio.sleep(60)
                    continue
                now = datetime.now()
                next_run = now.replace(
                    hour=int(config.daily.hour),
                    minute=int(config.daily.minute),
                    second=0,
                    microsecond=0,
                )
                if next_run <= now:
                    next_run += timedelta(days=1)
                await asyncio.sleep((next_run - now).total_seconds())
                if not self.config.daily.enabled:
                    continue
                await self._trigger_daily()
            except asyncio.CancelledError:
                raise
            except Exception:
                self.ctx.logger.exception("每日 MBTI 统计循环异常，60 秒后重试")
                await asyncio.sleep(60)

    async def _trigger_daily(self) -> None:
        for group_id in self.config.daily.group_ids:
            group_id = str(group_id).strip()
            if not group_id:
                continue
            try:
                payload = await self.ctx.chat.get_stream_by_group_id(group_id, platform="qq")
                stream = self._unwrap_stream(payload)
                stream_id = str(stream.get("stream_id") or stream.get("session_id") or "").strip()
                if not stream_id:
                    opened = await self.ctx.chat.open_session(
                        platform="qq",
                        chat_type="group",
                        group_id=group_id,
                    )
                    opened_stream = self._unwrap_stream(opened)
                    stream_id = str(
                        opened_stream.get("stream_id")
                        or opened_stream.get("session_id")
                        or ""
                    ).strip()
                if not stream_id:
                    self.ctx.logger.warning("每日统计跳过群 %s：没有聊天流", group_id)
                    continue
                announcement = self._announcement_instruction()
                await self.ctx.maisaka.proactive.trigger(
                    stream_id=stream_id,
                    intent=(
                        "现在是每日 MBTI 统计时间。请调用 mbti_stats 工具统计本群 MBTI 分布并发送图表。"
                        f"{announcement}"
                    ),
                    reason="mbti_daily_stats",
                    metadata={"group_id": group_id, "source": "mbtistats"},
                )
                self.ctx.logger.info("已触发每日 MBTI 统计: group_id=%s", group_id)
            except Exception:
                self.ctx.logger.exception("触发每日 MBTI 统计失败: group_id=%s", group_id)
            await asyncio.sleep(1.0)


def create_plugin() -> MBTIStatsPlugin:
    return MBTIStatsPlugin()
