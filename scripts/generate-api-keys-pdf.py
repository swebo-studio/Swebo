from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from bidi.algorithm import get_display
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "SWEBO-API-Keys.pdf")

# Register Hebrew font
pdfmetrics.registerFont(TTFont("Hebrew", "/System/Library/Fonts/SFHebrew.ttf"))
pdfmetrics.registerFont(TTFont("ArialUnicode", "/Library/Fonts/Arial Unicode.ttf"))

def H(text):
    """Apply bidi algorithm to display Hebrew correctly in RTL."""
    return get_display(text)

# ── Styles ─────────────────────────────────────────────────────────────────
BASE_FONT = "ArialUnicode"
BRAND     = colors.HexColor("#1A1A1A")
ACCENT    = colors.HexColor("#8B2635")   # maroon
MUTED     = colors.HexColor("#6B6B6B")
BG_LIGHT  = colors.HexColor("#F5F0E8")   # cream
BG_DARK   = colors.HexColor("#EDE8DF")

styles = getSampleStyleSheet()

title_style = ParagraphStyle("title", fontName=BASE_FONT, fontSize=22, textColor=BRAND,
                              spaceAfter=4, leading=28, alignment=1)
subtitle_style = ParagraphStyle("subtitle", fontName=BASE_FONT, fontSize=11, textColor=MUTED,
                                 spaceAfter=20, alignment=1)
section_style = ParagraphStyle("section", fontName=BASE_FONT, fontSize=13, textColor=colors.white,
                                leading=18, spaceAfter=0)
note_style = ParagraphStyle("note", fontName=BASE_FONT, fontSize=8.5, textColor=MUTED,
                              spaceAfter=10, leading=13)
required_style = ParagraphStyle("req", fontName=BASE_FONT, fontSize=8, textColor=ACCENT)
footer_style = ParagraphStyle("footer", fontName=BASE_FONT, fontSize=8, textColor=MUTED, alignment=1)

# ── Data ───────────────────────────────────────────────────────────────────
sections = [
    {
        "title": "GROW  —  Payment",
        "color": colors.HexColor("#1A6B3C"),
        "note": H("פתח חשבון ב-grow.co.il וקבל את הפרטים מהחשבון שלך"),
        "rows": [
            ("GROW_API_KEY",        H("מפתח API"),              True),
            ("GROW_TERMINAL_NUMBER",H("מספר טרמינל"),           True),
            ("GROW_PASSWORD",       H("סיסמת טרמינל"),          True),
        ],
    },
    {
        "title": "HFD  —  Delivery",
        "color": colors.HexColor("#1A4A6B"),
        "note": H("מתקבל עם פתיחת חשבון ב-HFD — פנה לנציג HFD"),
        "rows": [
            ("HFD_TOKEN",           H("Bearer token"),           True),
            ("HFD_CLIENT_NUMBER",   H("מספר לקוח"),              True),
            ("HFD_SHIPMENT_TYPE_CODE", H("קוד סוג משלוח"),       True),
            ("HFD_STAGE_CODE",      H("קוד שלב"),                True),
            ("HFD_CARGO_TYPE",      H("סוג מטען"),               True),
            ("HFD_ORDERER_NAME",    H('מוגדר כבר: "SWEBO"'),     False),
        ],
    },
    {
        "title": "ActiveTrail  —  Email & SMS",
        "color": colors.HexColor("#6B3A1A"),
        "note": H("ActiveTrail ← API ← אפליקציות Apps ← אינטגרציות ← עוד :נתיב ב-ActiveTrail"),
        "rows": [
            ("ACTIVETRAIL_API_KEY",    H("קוד גישה מ-ActiveTrail"),         True),
            ("ACTIVETRAIL_FROM_EMAIL", H("כתובת שולח מאומתת בחשבון"),       True),
            ("ACTIVETRAIL_FROM_NAME",  H('מוגדר כבר: "SWEBO"'),             False),
            ("ACTIVETRAIL_SMS_SENDER", H("שם שולח ב-SMS — עד 11 תווים לטיניים"), False),
            ("ACTIVETRAIL_LIST_ID",    H("מזהה רשימה להוספת מנויי ניוזלטר — אופציונלי"), False),
        ],
    },
    {
        "title": "Admin Contact",
        "color": colors.HexColor("#4A1A6B"),
        "note": H("פרטי הקשר שלך לקבלת התראות"),
        "rows": [
            ("ADMIN_PHONE",  H("מספר טלפון לקבלת SMS על הזמנות חדשות"),   True),
            ("ADMIN_EMAIL",  H("אימייל גיבוי אם SMS נכשל — אופציונלי"),   False),
        ],
    },
    {
        "title": "WhatsApp  —  Public Button",
        "color": colors.HexColor("#1A6B5A"),
        "note": H("הכפתור הצף באתר — הקישור הישיר כבר מוגדר בקוד"),
        "rows": [
            ("NEXT_PUBLIC_WHATSAPP_NUMBER", H("מספר הוואטסאפ של העסק  |  דוגמה: 972501234567"), False),
        ],
    },
]

# ── Build PDF ──────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    rightMargin=18*mm, leftMargin=18*mm,
    topMargin=18*mm, bottomMargin=18*mm,
    title="SWEBO API Keys",
    author="SWEBO",
)

W = A4[0] - 36*mm   # usable width

story = []

# Title block
story.append(Spacer(1, 6*mm))
story.append(Paragraph("SWEBO", title_style))
story.append(Paragraph("API Keys & Environment Variables", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1, color=BG_DARK, spaceAfter=14))

for sec in sections:
    # Section header bar
    header_table = Table(
        [[Paragraph(sec["title"], section_style)]],
        colWidths=[W],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), sec["color"]),
        ("TOPPADDING",    (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2*mm))

    # Note
    story.append(Paragraph(sec["note"], note_style))

    # Rows table
    col_var  = W * 0.42
    col_desc = W * 0.46
    col_req  = W * 0.12

    data = [[
        Paragraph("<b>Variable</b>", ParagraphStyle("th", fontName=BASE_FONT, fontSize=8.5, textColor=MUTED)),
        Paragraph(H("<b>תיאור</b>"), ParagraphStyle("th", fontName=BASE_FONT, fontSize=8.5, textColor=MUTED, alignment=2)),
        Paragraph("<b>Required</b>", ParagraphStyle("th", fontName=BASE_FONT, fontSize=8.5, textColor=MUTED, alignment=1)),
    ]]
    for var, desc, req in sec["rows"]:
        data.append([
            Paragraph(f"<font name='Courier'>{var}</font>",
                      ParagraphStyle("var", fontName=BASE_FONT, fontSize=8.5, textColor=BRAND, leading=13)),
            Paragraph(desc,
                      ParagraphStyle("desc", fontName=BASE_FONT, fontSize=8.5, textColor=BRAND, leading=13, alignment=2)),
            Paragraph("Yes" if req else "—",
                      ParagraphStyle("req", fontName=BASE_FONT, fontSize=8.5,
                                     textColor=ACCENT if req else MUTED, alignment=1)),
        ])

    t = Table(data, colWidths=[col_var, col_desc, col_req], repeatRows=1)
    row_count = len(data)
    t.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",    (0,0), (-1,0),         BG_DARK),
        ("TOPPADDING",    (0,0), (-1,-1),         5),
        ("BOTTOMPADDING", (0,0), (-1,-1),         5),
        ("LEFTPADDING",   (0,0), (-1,-1),         7),
        ("RIGHTPADDING",  (0,0), (-1,-1),         7),
        ("LINEBELOW",     (0,0), (-1,0),          0.5, MUTED),
        ("ROWBACKGROUNDS",(0,1), (-1,-1),         [colors.white, BG_LIGHT]),
        ("LINEBELOW",     (0,0), (-1, row_count-1), 0.3, BG_DARK),
        ("BOX",           (0,0), (-1,-1),         0.5, BG_DARK),
    ]))
    story.append(t)
    story.append(Spacer(1, 7*mm))

# Footer
story.append(HRFlowable(width="100%", thickness=0.5, color=BG_DARK, spaceBefore=4))
story.append(Spacer(1, 2*mm))
story.append(Paragraph("SWEBO  |  Generated for internal use only", footer_style))

doc.build(story)
print(f"PDF saved to: {os.path.abspath(OUTPUT)}")
