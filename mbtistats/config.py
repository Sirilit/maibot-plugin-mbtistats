"""Plugin config model for MBTI stats."""

from __future__ import annotations

from typing import ClassVar

from maibot_sdk import Field, PluginConfigBase

CONFIG_VERSION = "0.4.0"


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
    __ui_order__: ClassVar[int] = 2

    enabled: bool = Field(
        default=False,
        description="是否每天自动触发一次 MBTI 统计。AI 群由 AI 决定是否发送图表；统计专用群直接出图。",
    )
    hour: int = Field(default=0, description="每日自动统计的小时（0-23）。")
    minute: int = Field(default=0, description="每日自动统计的分钟（0-59）。")
    group_ids: list[str] = Field(
        default_factory=lambda: ["639990875", "1075254868"],
        description="每日自动统计的群号列表。",
    )


class AnnouncementSection(PluginConfigBase):
    """Project announcement settings."""

    __ui_label__: ClassVar[str] = "公告"
    __ui_icon__: ClassVar[str] = "megaphone"
    __ui_order__: ClassVar[int] = 3

    enabled: bool = Field(
        default=True,
        description="是否允许发送项目公告。",
    )
    extra: str = Field(
        default=(
            "一个小新闻（）\n"
            "最近 siri 想改进一下 bot 制作统计图时的一个美术细节，"
            "现在统计图里只会在最开头处显示“本次统计最多的人格”和第一名的全身图，"
            "所以我们现在有点想把它换成一个更能代表 16 人格的版本："
            "给每种人格选一个代表物件，比如 INTP 是小锥形瓶、INFP 是小蝴蝶、ESTP 是小墨镜，"
            "让这些物件按照真实的人数比例来自然紧凑地排成一个背景板，"
            "中心再放一段文字说明本次统计数量前 3 的人格是哪些；\n\n"
            "奈何 siri 不太会画画......所以我们正在寻找一位可以帮忙制作这些素材的老师（）"
            "如果你对小物件插画、扁平风格或者视觉设计感兴趣，欢迎在群里说一声，"
            "或者私聊小面包或者 siri（如果他在群里的话）"
            "哪怕只是帮我们出出主意，或者帮忙转告给合适的朋友也都可以！"
            "非常感谢非常感谢w"
        ),
        description="公告正文（不含开头标题、GitHub 和开发者信息）；空行会拆成合并转发的多条消息。",
    )


class RenderSection(PluginConfigBase):
    """Host browser rendering settings."""

    __ui_label__: ClassVar[str] = "渲染"
    __ui_icon__: ClassVar[str] = "image"
    __ui_order__: ClassVar[int] = 4

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
    __ui_order__: ClassVar[int] = 5

    enabled: bool = Field(
        default=False,
        description="是否启用 /mbti-debug（或 /mbti_debug）确定性调试命令。",
    )


class AccessSection(PluginConfigBase):
    """Per-group access control for AI chat."""

    __ui_label__: ClassVar[str] = "访问控制"
    __ui_icon__: ClassVar[str] = "shield"
    __ui_order__: ClassVar[int] = 1

    ai_group_ids: list[str] = Field(
        default_factory=list,
        description=(
            "允许 AI 正常聊天的群号列表。列表之外的群进入统计专用模式："
            "只放行 /mbti 与 /mbti-debug，其他消息在进入上下文前拦截。"
            "留空表示所有群都进入统计专用模式。"
        ),
    )


class MBTISTatsConfig(PluginConfigBase):
    """Config exposed in the MaiBot WebUI."""

    __ui_label__: ClassVar[str] = "MBTI Stats"

    plugin: PluginSection = Field(default_factory=PluginSection)
    access: AccessSection = Field(default_factory=AccessSection)
    daily: DailySection = Field(default_factory=DailySection)
    announcement: AnnouncementSection = Field(default_factory=AnnouncementSection)
    render: RenderSection = Field(default_factory=RenderSection)
    debug: DebugSection = Field(default_factory=DebugSection)


MBTISTatsConfig.model_rebuild()
