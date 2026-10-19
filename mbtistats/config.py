"""Plugin config model (optional at skeleton stage)."""

from __future__ import annotations

from maibot_sdk import Field, PluginConfigBase


class MBTISTatsConfig(PluginConfigBase):
    """Config exposed in the MaiBot WebUI."""

    __ui_label__ = "MBTI Stats"

    enabled: bool = Field(default=True, description="是否启用 MBTI 统计")
