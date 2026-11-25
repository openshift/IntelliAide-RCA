"""Build RCA stage exports as PDF, OOXML (.docx), and Word HTML (.doc) with causal-DAG images."""

from __future__ import annotations

import html
import io
import os
import re
import tempfile

from docx import Document
from docx.shared import Inches, Pt
from PIL import Image

# Letter page content area with 1 in margins.
_PAGE_CONTENT_WIDTH_IN = 6.5
_PAGE_CONTENT_MAX_HEIGHT_IN = 8.0

# AIA-009: All notice text loaded from the single source of truth.
from utils.content import notices as _notices

AI_NOTICE_TEXT = _notices.export_disclaimer.body
_AI_NOTICE_HEADING = _notices.export_disclaimer.heading
_AI_NOTICE_PDF_FOOTER = _notices.export_disclaimer.pdf_footer

_AI_NOTICE_HTML = (
    '<div style="border:2px solid #d97706;background:#fffbeb;padding:12px 16px;'
    'margin:0 0 24px 0;border-radius:6px;font-size:10pt;">'
    f'<strong style="color:#92400e;">&#9888; {html.escape(_AI_NOTICE_HEADING)}</strong><br/>'
    f"{html.escape(AI_NOTICE_TEXT)}"
    "</div>"
)


def split_after_heading(text: str, heading_title: str) -> tuple[str, str]:
    """Split markdown after a ## section (matches frontend splitAfterHeading)."""
    if not text:
        return text, ""
    lines = text.split("\n")
    target = heading_title.strip().lower()
    found_target = False
    split_index = -1
    for i, line in enumerate(lines):
        m = re.match(r"^##\s+(.+)", line)
        if not m:
            continue
        title = m.group(1).strip().lower()
        if found_target:
            split_index = i
            break
        if title == target:
            found_target = True
    if not found_target or split_index == -1:
        return text, ""
    return (
        "\n".join(lines[:split_index]).rstrip(),
        "\n".join(lines[split_index:]).lstrip(),
    )


def _text_block_to_html(text: str) -> str:
    return html.escape(text or "").replace("\n", "<br/>")


def _causal_dag_embed_html(image_rel_path: str) -> str:
    """Word/Google-Docs-safe HTML image reference via a sibling *_files folder."""
    safe_src = html.escape(image_rel_path, quote=True)
    return (
        '<h2 style="font-size:13pt;color:#1e293b;margin:24px 0 8px 0;'
        'border-bottom:1px solid #e2e8f0;padding-bottom:4px;">Causal Chain</h2>'
        '<p style="font-size:9pt;color:#64748b;margin:0 0 12px 0;">'
        "Visual map of how the identified causes led to the reported symptom(s)."
        "</p>"
        f'<img src="{safe_src}" alt="Causal Chain diagram" '
        'style="display:block;width:100%;max-width:6.5in;max-height:8in;'
        'height:auto;object-fit:contain;margin:0 auto 24px auto;" />'
    )


def build_rca_stage_doc_html(
    title: str,
    body_text: str,
    *,
    image_rel_path: str | None = None,
) -> str:
    """Word-compatible HTML saved as .doc, with optional relative-path DAG image."""
    safe_title = html.escape(title)
    if image_rel_path:
        before, after = split_after_heading(body_text, "Executive Summary")
        body_parts = [
            _text_block_to_html(before),
            _causal_dag_embed_html(image_rel_path),
        ]
        if after:
            body_parts.append(f"<div>{_text_block_to_html(after)}</div>")
        safe_body = "\n".join(body_parts)
    else:
        safe_body = f"<div>{_text_block_to_html(body_text)}</div>"
    return f"""<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>{safe_title}</title>
  <style>
    body {{
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      margin: 1in;
      color: #1f2937;
      white-space: normal;
      word-break: break-word;
    }}
    h1 {{
      font-size: 18pt;
      margin: 0 0 14px 0;
      color: #111827;
    }}
    img {{
      max-width: 6.5in;
      max-height: 8in;
      height: auto;
    }}
  </style>
</head>
<body>
  <h1>{safe_title}</h1>
  {_AI_NOTICE_HTML}
  <div>{safe_body}</div>
</body>
</html>"""


def _add_markdownish_paragraphs(doc: Document, text: str) -> None:
    if not text:
        return
    for line in text.split("\n"):
        heading2 = re.match(r"^##\s+(.+)", line.strip())
        heading1 = re.match(r"^#\s+(.+)", line.strip())
        if heading2:
            doc.add_heading(heading2.group(1).strip(), level=2)
        elif heading1:
            doc.add_heading(heading1.group(1).strip(), level=1)
        elif line.strip():
            doc.add_paragraph(line)
        else:
            doc.add_paragraph("")


def _add_causal_dag_to_docx(doc: Document, dag_png: bytes) -> None:
    doc.add_heading("Causal Chain", level=2)
    note = doc.add_paragraph(
        "Visual map of how the identified causes led to the reported symptom(s)."
    )
    if note.runs:
        note.runs[0].font.size = Pt(9)
    stream = io.BytesIO(dag_png)
    doc.add_picture(stream, width=Inches(_PAGE_CONTENT_WIDTH_IN))


_UNICODE_REPLACEMENTS = {
    "\u2014": "-",  # em dash
    "\u2013": "-",  # en dash
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2026": "...",
    "\u2192": "->",
    "\u00a0": " ",
}


def _register_pdf_fonts(pdf) -> tuple[str, bool]:
    """Register DejaVu when available; return (font family name, unicode_ok)."""
    dejavu = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    dejavu_b = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    dejavu_i = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"
    if os.path.exists(dejavu):
        pdf.add_font("DejaVu", "", dejavu, uni=True)
        if os.path.exists(dejavu_b):
            pdf.add_font("DejaVu", "B", dejavu_b, uni=True)
        if os.path.exists(dejavu_i):
            pdf.add_font("DejaVu", "I", dejavu_i, uni=True)
        return "DejaVu", True
    return "Helvetica", False


def _pdf_safe_text(text: str, unicode_ok: bool) -> str:
    if unicode_ok:
        return text
    for src, dst in _UNICODE_REPLACEMENTS.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _pdf_write_line(
    pdf,
    text: str,
    *,
    font: str,
    unicode_ok: bool,
    style: str = "",
    size: int = 11,
    height: float = 6,
) -> None:
    from fpdf.enums import XPos, YPos

    pdf.set_font(font, style, size)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        0,
        height,
        _pdf_safe_text(text, unicode_ok),
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )


def _add_markdownish_pdf_text(pdf, text: str, *, font: str, unicode_ok: bool) -> None:
    if not text:
        return
    for line in text.split("\n"):
        heading2 = re.match(r"^##\s+(.+)", line.strip())
        heading1 = re.match(r"^#\s+(.+)", line.strip())
        if heading2:
            pdf.ln(4)
            _pdf_write_line(
                pdf,
                heading2.group(1).strip(),
                font=font,
                unicode_ok=unicode_ok,
                style="B",
                size=13,
                height=7,
            )
            pdf.ln(2)
        elif heading1:
            pdf.ln(4)
            _pdf_write_line(
                pdf,
                heading1.group(1).strip(),
                font=font,
                unicode_ok=unicode_ok,
                style="B",
                size=16,
                height=8,
            )
            pdf.ln(2)
        elif line.strip():
            _pdf_write_line(
                pdf, line, font=font, unicode_ok=unicode_ok, size=11, height=6
            )
        else:
            pdf.ln(3)


def _add_causal_dag_to_pdf(pdf, dag_png: bytes, *, font: str, unicode_ok: bool) -> None:
    pdf.ln(4)
    _pdf_write_line(
        pdf,
        "Causal Chain",
        font=font,
        unicode_ok=unicode_ok,
        style="B",
        size=13,
        height=7,
    )
    pdf.set_text_color(100, 116, 139)
    _pdf_write_line(
        pdf,
        "Visual map of how the identified causes led to the reported symptom(s).",
        font=font,
        unicode_ok=unicode_ok,
        size=9,
        height=5,
    )
    pdf.set_text_color(31, 41, 55)
    pdf.ln(2)

    with Image.open(io.BytesIO(dag_png)) as img:
        px_w, px_h = img.size
    if px_w <= 0 or px_h <= 0:
        return

    max_w_mm = pdf.epw
    max_h_mm = _PAGE_CONTENT_MAX_HEIGHT_IN * 25.4
    aspect = px_h / px_w
    img_w_mm = max_w_mm
    img_h_mm = img_w_mm * aspect
    if img_h_mm > max_h_mm:
        img_h_mm = max_h_mm
        img_w_mm = img_h_mm / aspect

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(dag_png)
        tmp_path = tmp.name
    try:
        pdf.set_x(pdf.l_margin)
        pdf.image(tmp_path, w=img_w_mm, h=img_h_mm)
    finally:
        os.unlink(tmp_path)
    pdf.ln(4)


def _add_ai_notice_to_pdf(pdf, *, font: str, unicode_ok: bool) -> None:
    """Render an amber AI-generated notice box in the PDF."""
    x0 = pdf.l_margin
    y0 = pdf.get_y()
    box_w = pdf.epw
    # Draw background and border
    pdf.set_fill_color(255, 251, 235)  # amber-50
    pdf.set_draw_color(217, 119, 6)  # amber-600
    pdf.rect(x0, y0, box_w, 18, "FD")
    # Header
    pdf.set_xy(x0 + 4, y0 + 2)
    pdf.set_font(font, "B", 9)
    pdf.set_text_color(146, 64, 14)  # amber-800
    pdf.cell(0, 5, _pdf_safe_text(_AI_NOTICE_HEADING, unicode_ok))
    # Body
    pdf.set_xy(x0 + 4, y0 + 7)
    pdf.set_font(font, "", 8)
    pdf.set_text_color(120, 53, 15)
    pdf.multi_cell(box_w - 8, 4, _pdf_safe_text(AI_NOTICE_TEXT, unicode_ok))
    # Reset text color and move below the box
    pdf.set_text_color(31, 41, 55)
    pdf.set_y(y0 + 20)


def build_rca_stage_pdf(
    title: str,
    body_text: str,
    dag_png: bytes | None = None,
) -> bytes:
    """Letter-sized PDF with embedded causal-DAG PNG when available."""
    from fpdf import FPDF

    class _IntelliaidePDF(FPDF):
        """FPDF subclass that prints an AI-generated footer on every page."""

        _footer_font = "Helvetica"

        def footer(self):
            self.set_y(-15)
            # Footer is ASCII-only; use built-in Helvetica italic so we never require
            # a custom TTF italic variant (DejaVu "" + "B" only caused FPDFException in slim images).
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(148, 163, 184)
            self.cell(
                0,
                10,
                _pdf_safe_text(
                    f"{_AI_NOTICE_PDF_FOOTER} - " f"Page {self.page_no()}/{{nb}}",
                    False,
                ),
                align="C",
            )

    pdf = _IntelliaidePDF(format="Letter")
    pdf.alias_nb_pages()
    pdf.set_margins(25.4, 25.4, 25.4)
    pdf.set_auto_page_break(auto=True, margin=25.4)
    pdf.add_page()
    font, unicode_ok = _register_pdf_fonts(pdf)
    pdf._footer_font = font

    _pdf_write_line(
        pdf,
        title,
        font=font,
        unicode_ok=unicode_ok,
        style="B",
        size=18,
        height=10,
    )
    pdf.ln(2)

    # AIA-009: AI-Generated notice block (amber box)
    _add_ai_notice_to_pdf(pdf, font=font, unicode_ok=unicode_ok)
    pdf.ln(4)

    if dag_png:
        before, after = split_after_heading(body_text, "Executive Summary")
        _add_markdownish_pdf_text(pdf, before, font=font, unicode_ok=unicode_ok)
        _add_causal_dag_to_pdf(pdf, dag_png, font=font, unicode_ok=unicode_ok)
        _add_markdownish_pdf_text(pdf, after, font=font, unicode_ok=unicode_ok)
    else:
        _add_markdownish_pdf_text(pdf, body_text, font=font, unicode_ok=unicode_ok)

    return bytes(pdf.output())


def build_rca_stage_docx(
    title: str,
    body_text: str,
    dag_png: bytes | None = None,
) -> bytes:
    """OOXML .docx with embedded causal-DAG PNG (works in Word, Google Docs, LibreOffice)."""
    from docx.shared import RGBColor

    doc = Document()
    doc.add_heading(title, level=1)

    # AIA-009: AI-Generated notice block
    notice_para = doc.add_paragraph()
    run_header = notice_para.add_run(f"{_AI_NOTICE_HEADING}\n")
    run_header.bold = True
    run_header.font.size = Pt(9)
    run_header.font.color.rgb = RGBColor(0x92, 0x40, 0x0E)
    run_body = notice_para.add_run(AI_NOTICE_TEXT)
    run_body.font.size = Pt(8)
    run_body.font.color.rgb = RGBColor(0x78, 0x35, 0x0F)
    doc.add_paragraph("")

    if dag_png:
        before, after = split_after_heading(body_text, "Executive Summary")
        _add_markdownish_paragraphs(doc, before)
        _add_causal_dag_to_docx(doc, dag_png)
        _add_markdownish_paragraphs(doc, after)
    else:
        _add_markdownish_paragraphs(doc, body_text)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def append_rca_stage_bundle_entries(
    entries: list[tuple[str, str | bytes]],
    *,
    arc_prefix: str,
    doc_filename: str,
    title: str,
    body_text: str,
    dag_png: bytes | None,
) -> None:
    """Add .pdf and .docx entries for one RCA stage (DAG image embedded in both)."""
    base = doc_filename.rsplit(".", 1)[0]

    entries.append(
        (
            f"{arc_prefix}{base}.pdf",
            build_rca_stage_pdf(title, body_text, dag_png),
        )
    )
    entries.append(
        (
            f"{arc_prefix}{base}.docx",
            build_rca_stage_docx(title, body_text, dag_png),
        )
    )
