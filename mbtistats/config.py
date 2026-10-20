"""Plugin config model for MBTI stats."""

from __future__ import annotations

from typing import ClassVar

from maibot_sdk import Field, PluginConfigBase

CONFIG_VERSION = "0.2.0"


class PluginSection(PluginConfigBase):
    """Plugin master switch and config schema version."""

    __ui_label__: ClassVar[str] = "插件"
    __ui_icon__: ClassVar[str] = "plug"
    __ui_order__: ClassVar[int] = 0

    config_version: str = Field(
        default=CONFIG_VERSION,
        description="配置 schema 版本，请勿手动修改。",
        json_schema_extra={"disabled": True, "hidden": True, "order": 99},
    )
    enabled: bool = Field(default=True, description="是否启用 MBTI 统计。")


class DailySection(PluginConfigBase):
    """Daily proactive stats settings."""

    __ui_label__: ClassVar[str] = "每日统计"
    __ui_icon__: ClassVar[str] = "clock"
    __ui_order__: ClassVar[int] = 1

    enabled: bool = Field(
        default=False,
        description="是否每天自动触发一次 MBTI 统计。启用后由 AI 决定是否发送图表。",
    )
    hour: int = Field(default=0, description="每日自动统计的小时（0-23）。")
    minute: int = Field(default=0, description="每日自动统计的分钟（0-59）。")
    group_ids: list[str] = Field(
        default_factory=lambda: ["639990875", "1075254868"],
        description="每日自动统计的群号列表。",
    )


class RenderSection(PluginConfigBase):
    """Host browser rendering settings."""

    __ui_label__: ClassVar[str] = "渲染"
    __ui_icon__: ClassVar[str] = "image"
    __ui_order__: ClassVar[int] = 2

    timeout_ms: int = Field(
        default=30000,
        description="单次图表渲染的超时时间（毫秒）。复杂趋势图建议 30000。",
    )
    viewport_width: int = Field(default=1050, description="图表渲染视口宽度。")
    viewport_height: int = Field(default=1000, description="图表渲染视口高度。")
    queue_wait_seconds: float = Field(
        default=20.0,
        description="其他群正在渲染时，本次工具调用最多等待多少秒；超时返回 busy。",
    )


class DebugSection(PluginConfigBase):
    """Deterministic debug command settings."""

    __ui_label__: ClassVar[str] = "调试"
    __ui_icon__: ClassVar[str] = "bug"
    __ui_order__: ClassVar[int] = 3

    enabled: bool = Field(
        default=False,
        description="是否启用 /mbti-debug（或 /mbti_debug）确定性调试命令。",
    )


class MBTISTatsConfig(PluginConfigBase):
    """Config exposed in the MaiBot WebUI."""

    __ui_label__: ClassVar[str] = "MBTI Stats"

    plugin: PluginSection = Field(default_factory=PluginSection)
    daily: DailySection = Field(default_factory=DailySection)
    render: RenderSection = Field(default_factory=RenderSection)
    debug: DebugSection = Field(default_factory=DebugSection)


MBTISTatsConfig.model_rebuild()
