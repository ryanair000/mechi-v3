from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "playmechi-weekend-cup-moderator-guide.pdf"


MODERATORS = [
    ["codmadmin4256", "CODM", "254796054256", "codm.admin4256@mechi.club"],
    ["Washed", "CODM", "254797772145", "washed254@gmail.com"],
    ["shakur", "PUBG", "254793946829", "njirulee95@gmail.com"],
    ["efootball472", "eFootball", "254706327472", "efootball.admin7472@mechi.club"],
    ["Icrest", "eFootball", "254116685200", "reymwitakante@gmail.com"],
    ["Ranxxs", "eFootball", "254797818378", "ranxxsgaming@gmail.com"],
]


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=30,
            textColor=colors.HexColor("#07111E"),
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#334155"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=8,
            spaceAfter=7,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=7,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13.5,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#475569"),
            spaceAfter=3,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#064E3B"),
            backColor=colors.HexColor("#D1FAE5"),
            borderColor=colors.HexColor("#6EE7B7"),
            borderWidth=0.7,
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=7,
        ),
        "warning": ParagraphStyle(
            "Warning",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#7F1D1D"),
            backColor=colors.HexColor("#FEE2E2"),
            borderColor=colors.HexColor("#FCA5A5"),
            borderWidth=0.7,
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=7,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            leftIndent=10,
            firstLineIndent=-7,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=3,
        ),
        "toc": ParagraphStyle(
            "TOC",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.4,
            leading=13.5,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=4,
        ),
    }


def on_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#07111E"))
    canvas.rect(0, height - 18 * mm, width, 18 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18 * mm, height - 11 * mm, "PlayMechi Weekend Cup - Moderator Guide")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 18 * mm, height - 11 * mm, "May 2026")
    canvas.setStrokeColor(colors.HexColor("#E2E8F0"))
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 10 * mm, "Internal operator guide - share with approved moderators only")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def p(text, style):
    return Paragraph(text, style)


def bullets(items, styles):
    return [p(f"- {item}", styles["bullet"]) for item in items]


def make_table(data, col_widths=None, header=True):
    header_style = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
    cell_style = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=7.8,
        leading=10,
        textColor=colors.HexColor("#111827"),
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
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A") if header else colors.white),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white if header else colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
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
        title="PlayMechi Weekend Cup Moderator Guide",
        author="Mechi",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="guide", frames=[frame], onPage=on_page)])

    story = []
    story.append(Spacer(1, 18))
    story.append(p("PlayMechi Weekend Cup Moderator Guide", styles["title"]))
    story.append(
        p(
            "A practical operating manual for new moderators handling Weekend Cup payments, lobbies, scores, and eFootball bracket work.",
            styles["subtitle"],
        )
    )
    story.append(p("Quick Rule", styles["h1"]))
    story.append(
        p(
            "Only update players, lobbies, scores, and match results for your assigned game. If something looks wrong, pause and escalate to the admin instead of guessing.",
            styles["callout"],
        )
    )
    story.append(p("Table Of Contents", styles["h1"]))
    for item in [
        "1. Access and login",
        "2. Moderator account list",
        "3. Moderator desk map",
        "4. Payment and check-in workflow",
        "5. PUBG, CODM, and Free Fire lobby workflow",
        "6. Score entry workflow",
        "7. eFootball bracket workflow",
        "8. Result and payout rules",
        "9. Escalation checklist",
        "10. Match-day quick scripts",
    ]:
        story.append(p(item, styles["toc"]))
    story.append(PageBreak())

    story.append(p("1. Access And Login", styles["h1"]))
    story.extend(
        bullets(
            [
                "Open https://mechi.club/moderator-login.",
                "Sign in with the phone number or email attached to your moderator account.",
                "Use the temporary password given by the Boss or admin.",
                "After login, the site opens the moderator workspace at /moderators.",
                "The panel automatically limits normal moderators to their assigned game.",
            ],
            styles,
        )
    )
    story.append(
        p(
            "Password note: existing passwords cannot be recovered. The admin panel can reset moderator passwords and show fresh one-time credentials immediately after reset.",
            styles["warning"],
        )
    )

    story.append(p("2. Moderator Account List", styles["h1"]))
    story.append(
        p(
            "Current active moderator accounts from the live roster. Passwords are not listed because they are hashed and not retrievable.",
            styles["body"],
        )
    )
    data = [["Username", "Assigned desk", "Phone", "Email"]] + MODERATORS
    story.append(make_table(data, [32 * mm, 28 * mm, 32 * mm, 70 * mm]))
    story.append(Spacer(1, 8))
    story.append(
        p(
            "Admins with full access: Ryanair001, TestUser1, and tgprobe20260426182335. Use admin accounts only for supervision, password resets, and cross-game fixes.",
            styles["small"],
        )
    )

    story.append(p("3. Moderator Desk Map", styles["h1"]))
    desk_data = [
        ["Panel area", "Who uses it", "Purpose"],
        ["Weekend Cup Desk", "All moderators", "Review registrations, payment status, player details, and check-in status."],
        ["Lobbies", "PUBG, CODM, Free Fire", "Create room entries and mark lobbies as pending, active, or completed."],
        ["Scores", "PUBG, CODM, Free Fire", "Enter kills and placement per match. The panel calculates total points."],
        ["eFootball Bracket", "eFootball", "Generate bracket, enter scores, record walkovers, and advance winners."],
        ["Back to App", "All users", "Return to normal Mechi dashboard."],
    ]
    story.append(make_table(desk_data, [38 * mm, 36 * mm, 88 * mm]))

    story.append(PageBreak())
    story.append(p("4. Payment And Check-in Workflow", styles["h1"]))
    story.extend(
        bullets(
            [
                "Open Weekend Cup Desk.",
                "Search by username, in-game name, WhatsApp number, payment reference, or status.",
                "Confirm payment only when the reference or admin instruction is clear.",
                "Use Mark paid for simple confirmed payments.",
                "Use Edit when you need to set payment tier, amount, reference, note, or check-in status.",
                "Checked-in players are the only players used for lobbies, scores, and eFootball bracket generation.",
                "If payment is failed or refunded, set check-in back to registered.",
            ],
            styles,
        )
    )
    story.append(
        p(
            "Never mark a player paid because they say they paid. Use Paystack/admin confirmation, visible reference evidence, or direct Boss/admin instruction.",
            styles["warning"],
        )
    )

    story.append(p("5. PUBG, CODM, And Free Fire Lobby Workflow", styles["h1"]))
    story.extend(
        bullets(
            [
                "Open the Lobbies panel from the sidebar.",
                "Confirm the game label at the top matches your assigned game.",
                "Create a lobby with Lobby #, Match #, optional Room ID, and optional Password.",
                "Set lobby status to active when the room is open.",
                "Set lobby status to completed only after that match is finished.",
                "Room ID and password are sensitive operational details. Share only in approved player/admin channels.",
            ],
            styles,
        )
    )
    story.append(p("6. Score Entry Workflow", styles["h1"]))
    story.extend(
        bullets(
            [
                "Open Scores from the sidebar.",
                "Choose the match number you are entering.",
                "Only checked-in and paid players appear in the score list.",
                "Enter kills for every player.",
                "Enter placement where placement points apply.",
                "Save all scores after reviewing the table.",
                "Refresh after saving to confirm scores persisted.",
            ],
            styles,
        )
    )
    story.append(
        p(
            "Scoring currently wired: PUBG = 1 point per kill plus placement table, CODM = 3 points per kill plus placement table, Free Fire = 1 point per kill plus placement table. eFootball does not use this score panel.",
            styles["callout"],
        )
    )

    story.append(p("7. eFootball Bracket Workflow", styles["h1"]))
    story.extend(
        bullets(
            [
                "Open eFootball Bracket.",
                "Generate bracket only after check-in is done and at least two paid players are checked in.",
                "Generating a new bracket replaces the existing bracket.",
                "Enter match scores only when both players are present.",
                "Use Walkover when only one player is present or an admin confirms the opponent is absent.",
                "Winners advance automatically. Semi-final losers are placed into the bronze match.",
                "Refresh after each round to verify the next round is populated correctly.",
            ],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(p("8. Result And Payout Rules", styles["h1"]))
    story.extend(
        bullets(
            [
                "Moderators can help finalize results for assigned games, but payout status is admin-sensitive.",
                "Cash prize values should match the public Weekend Cup page and moderator brief.",
                "Free Fire prizes: 1st KSh 1,250, 2nd KSh 750, 3rd KSh 500.",
                "Do not promise payout time. Tell winners that admin handles payout confirmation.",
                "If a result is disputed, stop editing and escalate before payout status changes.",
            ],
            styles,
        )
    )

    story.append(p("9. Escalation Checklist", styles["h1"]))
    checklist = [
        ["Situation", "What to do"],
        ["Wrong player/game", "Do not edit. Send username, phone, game, and screenshot to admin."],
        ["Payment unclear", "Set manual review or leave pending. Ask admin to verify Paystack."],
        ["Player missing from score list", "Check that they are paid and checked in."],
        ["Room ID/password wrong", "Correct lobby entry if you created it; otherwise escalate."],
        ["Score dispute", "Collect screenshots and pause final result edits."],
        ["Bracket mistake", "Do not regenerate casually. Ask admin before replacing a bracket."],
        ["Toxicity/cheating", "Record evidence and escalate. Do not negotiate punishments in chat."],
    ]
    story.append(make_table(checklist, [48 * mm, 114 * mm]))

    story.append(p("10. Match-day Quick Scripts", styles["h1"]))
    story.append(p("Payment pending reply:", styles["h2"]))
    story.append(p("Your slot is still pending payment confirmation. Please send the payment reference or wait for admin confirmation.", styles["body"]))
    story.append(p("Room shared reply:", styles["h2"]))
    story.append(p("Room details are posted. Join using the same in-game name you registered with. Late or wrong-account entries may be rejected.", styles["body"]))
    story.append(p("Result proof reply:", styles["h2"]))
    story.append(p("Please send a clear screenshot showing match result, username, kills/score, and placement where applicable.", styles["body"]))
    story.append(p("Prize reply:", styles["h2"]))
    story.append(p("Admin will verify final results and payout eligibility before prizes are released. Please wait for official confirmation.", styles["body"]))

    story.append(Spacer(1, 8))
    story.append(
        p(
            "Final moderator rule: be fast, factual, and calm. The panel is the source of action; WhatsApp chatter is not proof by itself.",
            styles["callout"],
        )
    )

    doc.build(story)


if __name__ == "__main__":
    build()
    print(OUT)
