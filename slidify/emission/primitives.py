from __future__ import annotations

from pptx.util import Emu


def set_text_frame_margins_zero(tf) -> None:
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)

