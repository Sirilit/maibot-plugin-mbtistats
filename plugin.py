"""MaiBot MBTI Stats plugin skeleton."""

from __future__ import annotations

from typing import Any

from maibot_sdk import CONFIG_RELOAD_SCOPE_SELF, Command, MaiBotPlugin, Tool
from maibot_sdk.types import ToolParameterInfo, ToolParamType


class MBTISTatsPlugin(MaiBotPlugin):
    """MBTI group statistics plugin."""

    async def on_load(self) -> None:
        self.ctx.logger.info("mbtistats plugin loaded")

    async def on_unload(self) -> None:
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

    @Tool(
        "mbti_stats",
        description=(
            "统计当前群的 MBTI 类型与特质分布，并生成图表。"
            "当用户想了解群里的 MBTI 分布时调用。"
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
        """Tool entry point.

        下一步在这里接：
        1. group_id = kwargs.get("group_id")
        2. ctx.api.call("adapter.napcat.group.get_group_member_list", ...)
        3. mbtistats.analyze / mbtistats.transform_render_data
        4. ctx.render.html2png(...) + ctx.send.image(...)
        """
        group_id = kwargs.get("group_id")
        self.ctx.logger.info(
            "mbti_stats called: stream_id=%s group_id=%s",
            stream_id,
            group_id,
        )
        return {
            "success": False,
            "message": "mbti_stats skeleton: analyze/render 还没接上",
        }

    @Command("mbti", pattern=r"^/mbti(?:\s|$)")
    async def mbti_command(self, **kwargs: Any):
        """Slash-command fallback: /mbti."""
        stream_id = kwargs.get("stream_id")
        if stream_id:
            await self.ctx.send.text("MBTI 插件骨架已加载。", stream_id)
        return True, "MBTI 插件骨架已加载。", 2


def create_plugin() -> MBTISTatsPlugin:
    return MBTISTatsPlugin()
