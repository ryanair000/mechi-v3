from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "playmechi-moderator-panel-guide-final.pdf"

ACCENT = colors.HexColor("#2DD4BF")
CORAL = colors.HexColor("#FB7185")
DARK = colors.HexColor("#07111E")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#CBD5E1")
PAPER = colors.HexColor("#F8FAFC")
GREEN_BG = colors.HexColor("#D1FAE5")
AMBER_BG = colors.HexColor("#FEF3C7")
RED_BG = colors.HexColor("#FEE2E2")


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=DARK,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15.5,
            leading=19,
            textColor=DARK,
            spaceBefore=6,
            spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=INK,
            spaceBefore=5,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12.2,
            textColor=INK,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=MUTED,
            spaceAfter=3,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=12,
            leftIndent=10,
            firstLineIndent=-7,
            textColor=INK,
            spaceAfter=2.5,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.7,
            leading=12,
            textColor=colors.HexColor("#064E3B"),
            backColor=GREEN_BG,
            borderColor=colors.HexColor("#6EE7B7"),
            borderWidth=0.7,
            borderPadding=6,
            spaceBefore=3,
            spaceAfter=7,
        ),
        "warning": ParagraphStyle(
            "Warning",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.7,
            leading=12,
            textColor=colors.HexColor("#7F1D1D"),
            backColor=RED_BG,
            borderColor=colors.HexColor("#FCA5A5"),
            borderWidth=0.7,
            borderPadding=6,
            spaceBefore=3,
            spaceAfter=7,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
    }


class FlowDiagram(Flowable):
    def __init__(self, steps: list[str], width: float = 162 * mm, box_height: float = 15 * mm):
        super().__init__()
        self.steps = steps
        self.width = width
        self.box_height = box_height
        self.height = box_height + 6 * mm

    def wrap(self, avail_width, avail_height):
        self.width = min(self.width, avail_width)
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        gap = 5 * mm
        box_width = (self.width - gap * (len(self.steps) - 1)) / len(self.steps)
        y = 3 * mm
        for index, step in enumerate(self.steps):
            x = index * (box_width + gap)
            fill = colors.HexColor("#ECFEFF") if index % 2 == 0 else colors.HexColor("#FFF7ED")
            stroke = ACCENT if index % 2 == 0 else CORAL
            canvas.setFillColor(fill)
            canvas.setStrokeColor(stroke)
            canvas.roundRect(x, y, box_width, self.box_height, 3 * mm, stroke=1, fill=1)
            canvas.setFillColor(DARK)
            canvas.setFont("Helvetica-Bold", 7.2)
            words = step.split()
            line_one = " ".join(words[:3])
            line_two = " ".join(words[3:])
            canvas.drawCentredString(x + box_width / 2, y + 8.9 * mm, line_one)
            if line_two:
                canvas.setFont("Helvetica", 6.8)
                canvas.drawCentredString(x + box_width / 2, y + 4.9 * mm, line_two)
            if index < len(self.steps) - 1:
                ax = x + box_width + 1.3 * mm
                ay = y + self.box_height / 2
                canvas.setStrokeColor(MUTED)
                canvas.line(ax, ay, ax + gap - 2.6 * mm, ay)
                canvas.line(ax + gap - 2.6 * mm, ay, ax + gap - 4.2 * mm, ay + 1.6 * mm)
                canvas.line(ax + gap - 2.6 * mm, ay, ax + gap - 4.2 * mm, ay - 1.6 * mm)


class SidebarMap(Flowable):
    def __init__(self, width: float = 162 * mm):
        super().__init__()
        self.width = width
        self.height = 76 * mm

    def wrap(self, avail_width, avail_height):
        self.width = min(self.width, avail_width)
        return self.width, self.height

    def draw(self):
        c = self.canv
        x0 = 5 * mm
        y0 = 4 * mm
        sidebar_w = 42 * mm
        screen_w = self.width - sidebar_w - 12 * mm
        c.setFillColor(colors.HexColor("#07111E"))
        c.roundRect(x0, y0, sidebar_w, self.height - 8 * mm, 3 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x0 + 5 * mm, y0 + self.height - 18 * mm, "PLAYMECHI")
        items = ["Weekend Cup Desk", "Lobbies", "Scores", "Bracket", "Back to App"]
        for index, item in enumerate(items):
            y = y0 + self.height - 31 * mm - index * 9.5 * mm
            active = index == 0
            c.setFillColor(colors.HexColor("#0F766E") if active else colors.HexColor("#111827"))
            c.roundRect(x0 + 4 * mm, y, sidebar_w - 8 * mm, 7 * mm, 1.6 * mm, stroke=0, fill=1)
            c.setFillColor(colors.white if active else colors.HexColor("#CBD5E1"))
            c.setFont("Helvetica-Bold", 6.8)
            c.drawString(x0 + 7 * mm, y + 2.2 * mm, item)

        sx = x0 + sidebar_w + 7 * mm
        sy = y0
        c.setStrokeColor(LINE)
        c.setFillColor(PAPER)
        c.roundRect(sx, sy, screen_w, self.height - 8 * mm, 3 * mm, stroke=1, fill=1)
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(sx + 6 * mm, sy + self.height - 18 * mm, "Weekend Cup payment ops")
        c.setFont("Helvetica", 7.2)
        c.setFillColor(MUTED)
        c.drawString(sx + 6 * mm, sy + self.height - 26 * mm, "Search players, check status, confirm payments, manage check-in.")

        cards = [("Paid", "confirmed slots"), ("Pending", "needs follow-up"), ("Checked in", "ready to play")]
        card_w = (screen_w - 18 * mm) / 3
        for index, (label, desc) in enumerate(cards):
            cx = sx + 6 * mm + index * (card_w + 3 * mm)
            cy = sy + self.height - 47 * mm
            c.setFillColor(colors.white)
            c.roundRect(cx, cy, card_w, 15 * mm, 2 * mm, stroke=1, fill=1)
            c.setFillColor(DARK)
            c.setFont("Helvetica-Bold", 7.2)
            c.drawString(cx + 3 * mm, cy + 9 * mm, label)
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 6.2)
            c.drawString(cx + 3 * mm, cy + 4.5 * mm, desc)

        c.setFillColor(colors.HexColor("#ECFEFF"))
        c.roundRect(sx + 6 * mm, sy + 9 * mm, screen_w - 12 * mm, 14 * mm, 2 * mm, stroke=1, fill=1)
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold", 7.1)
        c.drawString(sx + 10 * mm, sy + 16 * mm, "Revenue is hidden from moderators")
        c.setFont("Helvetica", 6.5)
        c.drawString(sx + 10 * mm, sy + 12 * mm, "Do not handle revenue questions from the panel.")


def on_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(DARK)
    canvas.rect(0, height - 18 * mm, width, 18 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18 * mm, height - 11 * mm, "PlayMechi - Moderator Panel Guide")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 18 * mm, height - 11 * mm, "Updated 29 May 2026")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.6)
    canvas.drawString(18 * mm, 10 * mm, "Share with approved PlayMechi moderators only")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def p(text: str, style: ParagraphStyle):
    return Paragraph(text, style)


def bullets(items: list[str], styles):
    return [p(f"- {item}", styles["bullet"]) for item in items]


def make_table(data, col_widths=None, header=True, font_size=7.4):
    header_style = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=font_size,
        leading=font_size + 2,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
    cell_style = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=font_size,
        leading=font_size + 2.5,
        textColor=INK,
        alignment=TA_LEFT,
    )
    wrapped = []
    for row_index, row in enumerate(data):
        style = header_style if header and row_index == 0 else cell_style
        wrapped.append([Paragraph(str(cell), style) for cell in row])

    table = Table(wrapped, colWidths=col_widths, repeatRows=1 if header else 0, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK if header else colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, PAPER]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
        title="PlayMechi Moderator Panel Guide",
        author="Mechi",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="guide", frames=[frame], onPage=on_page)])

    story = []
    story.append(Spacer(1, 12))
    story.append(p("Moderator Panel Guide", styles["title"]))
    story.append(
        p(
            "Simple match-day instructions for checking players, managing lobbies, entering scores, and escalating problems.",
            styles["subtitle"],
        )
    )
    story.append(p("Read This First", styles["h1"]))
    story.append(
        p(
            "Use only the game or tournament shown on your moderator panel. Revenue and entry-fee values are hidden from moderators.",
            styles["callout"],
        )
    )
    story.append(SidebarMap())
    story.append(p("Panel map: the left menu changes based on your assigned Weekend Cup role.", styles["caption"]))
    story.append(p("What This Guide Covers", styles["h1"]))
    for item in [
        "Login and account access",
        "How to use the moderator desk",
        "How to create lobbies and enter scores",
        "How to run eFootball bracket work",
        "What to escalate instead of guessing",
    ]:
        story.append(p(f"- {item}", styles["bullet"]))

    story.append(PageBreak())
    story.append(p("1. Login", styles["h1"]))
    story.append(FlowDiagram(["Open moderator login", "Enter account details", "Open Weekend Cup desk", "Check assigned game"]))
    story.extend(
        bullets(
            [
                "Go to https://mechi.club/moderator-login.",
                "Use the username, phone, or email shared by admin.",
                "Use the latest password shared by admin. Old passwords may have been reset.",
                "After login, open Moderators > Weekend Cup.",
                "Check the sidebar label before doing any action.",
            ],
            styles,
        )
    )
    story.append(p("If you cannot log in, do not create a second account. Ask admin to reset your moderator password.", styles["warning"]))

    story.append(p("2. What You Can See", styles["h1"]))
    access = [
        ["Panel", "Use it for", "Important note"],
        ["Weekend Cup Desk", "Find players, review payment/check-in status, save notes, and mark confirmed players.", "You only see games assigned to you."],
        ["Lobbies", "Create room entries and mark rooms active or completed.", "Used for PUBG, CODM, and Free Fire style rooms."],
        ["Scores", "Enter kills and placement for each match.", "Only paid and checked-in players appear."],
        ["eFootball Bracket", "Generate bracket, enter scores, record walkovers, and advance winners.", "Only use if your panel shows bracket access."],
    ]
    story.append(make_table(access, [38 * mm, 76 * mm, 48 * mm], font_size=7.2))

    story.append(PageBreak())
    story.append(p("3. Moderator Desk", styles["h1"]))
    story.append(FlowDiagram(["Search player", "Review status", "Confirm evidence", "Save update"]))
    story.extend(
        bullets(
            [
                "Use search for username, in-game name, WhatsApp number, payment reference, or status.",
                "Paid means the player has a confirmed slot.",
                "Pending means the player needs payment confirmation or follow-up.",
                "Checked in means the player is ready for match operations.",
                "Use Mark paid only when payment evidence is clear.",
                "Use Edit when you need to add a reference, note, or change check-in status.",
            ],
            styles,
        )
    )
    story.append(p("Payment safety rule: a WhatsApp message saying 'I paid' is not enough. Use Paystack/admin confirmation, visible reference evidence, or direct Boss/admin instruction.", styles["warning"]))
    story.append(p("What moderators do not see", styles["h2"]))
    story.extend(
        bullets(
            [
                "Revenue card is hidden.",
                "KSh entry fee values are hidden.",
                "Amount paid input is hidden.",
                "Do not ask players about admin-only revenue information.",
            ],
            styles,
        )
    )

    story.append(p("4. Payment And Check-in Decisions", styles["h1"]))
    decision = [
        ["Player state", "Moderator action"],
        ["Payment pending", "Leave pending or add a note. Ask admin if payment is unclear."],
        ["Payment confirmed", "Mark paid, then tell player to check in when ready."],
        ["Wrong game", "Do not edit. Send username, phone, and screenshot to admin."],
        ["Player cannot find dashboard", "Send them to https://mechi.club/weekendcup/dashboard."],
        ["Disqualified or banned issue", "Stop and escalate. Do not negotiate account action."],
    ]
    story.append(make_table(decision, [45 * mm, 117 * mm]))

    story.append(PageBreak())
    story.append(p("5. Lobbies For Battle Royale Games", styles["h1"]))
    story.append(FlowDiagram(["Create lobby", "Add room details", "Mark active", "Mark completed"]))
    story.extend(
        bullets(
            [
                "Open your assigned game Lobbies panel from the sidebar.",
                "Create Lobby # and Match # before sharing room details.",
                "Room ID and password are optional while preparing, but should be added before players enter.",
                "Set status to active when the room is open.",
                "Set status to completed after that match is finished.",
                "If you do not see a game in your panel, do not try to manage it.",
            ],
            styles,
        )
    )
    story.append(p("Room details are sensitive. Share them only in approved player/admin channels.", styles["warning"]))

    story.append(p("6. Scores For Battle Royale Games", styles["h1"]))
    story.append(FlowDiagram(["Pick match number", "Enter kills", "Enter placement", "Save all scores"]))
    scoring = [
        ["Game", "Kill points", "Placement notes"],
        ["PUBG", "1 point per kill", "Placement table applies for top placements."],
        ["CODM", "3 points per kill", "Placement table applies for top placements."],
        ["Free Fire", "1 point per kill", "Placement table applies for top placements."],
    ]
    story.append(make_table(scoring, [35 * mm, 35 * mm, 92 * mm]))
    story.extend(
        bullets(
            [
                "Only paid and checked-in players appear in the score panel.",
                "Enter every player carefully before saving.",
                "Refresh after saving to confirm the data persisted.",
                "If a score is disputed, pause the result and collect proof screenshots.",
            ],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(p("7. eFootball Bracket", styles["h1"]))
    story.append(FlowDiagram(["Check players in", "Generate bracket", "Enter match scores", "Advance winners"]))
    story.extend(
        bullets(
            [
                "Only use bracket tools if they appear in your panel.",
                "Generate the bracket only after check-in is done.",
                "Generating a new bracket replaces the old bracket. Ask admin before regenerating a live bracket.",
                "Enter scores when both players are present.",
                "Use Walkover only when an opponent is absent or admin confirms it.",
                "Refresh after each round to verify winners advanced correctly.",
            ],
            styles,
        )
    )
    bracket = [
        ["Round", "What happens"],
        ["Round of 32 / 16", "Enter winner scores and advance winners."],
        ["Quarter-finals", "Same: verify match proof before saving."],
        ["Semi-finals", "Winners go final. Losers go bronze match."],
        ["Bronze", "Determines 3rd and 4th place."],
        ["Final", "Determines 1st and 2nd place."],
    ]
    story.append(make_table(bracket, [42 * mm, 120 * mm]))

    story.append(p("8. Escalation Rules", styles["h1"]))
    escalation = [
        ["Problem", "Action"],
        ["Payment not clear", "Leave pending/manual review and ask admin."],
        ["Wrong game/duplicate player", "Do not edit. Escalate with screenshot."],
        ["Score dispute", "Collect proof, pause final result edits."],
        ["Player abuse/cheating", "Record evidence and escalate."],
        ["Bracket looks wrong", "Do not regenerate casually. Ask admin first."],
        ["Payout question", "Say admin verifies payout eligibility and timing."],
    ]
    story.append(make_table(escalation, [48 * mm, 114 * mm]))

    story.append(PageBreak())
    story.append(p("9. Player Reply Scripts", styles["h1"]))
    scripts = [
        ["Situation", "Reply"],
        ["Pending payment", "Your slot is still pending payment confirmation. Please send the payment reference or wait for admin confirmation."],
        ["Room opened", "Room details are posted. Join using the same in-game name you registered with. Late or wrong-account entries may be rejected."],
        ["Need result proof", "Please send a clear screenshot showing match result, username, kills/score, and placement where applicable."],
        ["Prize question", "Admin will verify final results and payout eligibility before prizes are released. Please wait for official confirmation."],
        ["Wrong game", "I cannot edit another game from this panel. I have escalated this to admin for review."],
    ]
    story.append(make_table(scripts, [37 * mm, 125 * mm], font_size=7.1))
    story.append(Spacer(1, 6))
    story.append(p("Final moderator rule", styles["h1"]))
    story.append(p("Be fast, factual, and calm. The panel is the action source. Chat messages are useful context, but they are not proof by themselves.", styles["callout"]))

    doc.build(story)


if __name__ == "__main__":
    build()
    print(OUT)
