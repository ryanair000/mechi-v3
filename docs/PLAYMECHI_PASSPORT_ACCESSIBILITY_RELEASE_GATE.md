# PlayMechi Gamer Passport accessibility release gate

Status: automated gate implemented; assisted-technology sign-off required for production promotion

Standard target: WCAG 2.2 AA
Owner: Product and Trust

## Automated required checks

The required Passport browser job now fails on serious or critical axe findings
tagged for WCAG 2 A/AA, WCAG 2.1 AA, or WCAG 2.2 AA. It scans:

- canonical public Gamer Passport;
- authenticated owner Passport editor;
- Gamer Card studio.

The same job also proves:

- the game editor has a programmatic dialog name;
- initial focus enters the dialog;
- Tab and Shift+Tab remain inside it;
- Escape closes it;
- focus returns to the button that opened it;
- icon-only close controls have accessible names;
- the public Passport has no horizontal overflow at 320px and 360px;
- the surface receives the operating system's reduced-motion preference.

Comparison, privacy, Gamer CV, and export routes remain covered by semantic
role/name assertions in their functional browser journeys. Any new Passport
surface must be added to the axe matrix before it can be treated as release
critical.

## Manual assisted-technology sign-off

Before production promotion, record browser/OS/version, tester, date, result,
and issue links for each row. A failure blocks promotion.

| Journey | Keyboard only | NVDA + Firefox/Chrome | VoiceOver + Safari | 200% zoom | High contrast | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Create/edit identity and safe handle | Required | Required | Required | Required | Required | Pending release operator |
| Set Public/Friends/Private and Discovery | Required | Required | Required | Required | Required | Pending release operator |
| Add five games and edit a story-game journal | Required | Required | Required | Required | Required | Pending release operator |
| View friend/public/restricted Passport | Required | Required | Required | Required | Required | Pending release operator |
| Compare two Passports | Required | Required | Required | Required | Required | Pending release operator |
| Choose, preview, and download Gamer Card | Required | Required | Required | Required | Required | Pending release operator |
| Read and download Gamer CV | Required | Required | Required | Required | Required | Pending release operator |
| Create and download private data export | Required | Required | Required | Required | Required | Pending release operator |

## Review details

- Headings must describe the page rather than the visual card treatment.
- Privacy controls must announce both their label and current value.
- Verification cannot be communicated by color alone.
- Decorative images use empty alternatives; identity images describe the
  player/avatar purpose without repeating adjacent text unnecessarily.
- Visible focus must remain distinguishable across every cosmetic/theme token.
- Error and success messages must be announced and must remain until the user
  has sufficient time to act.
- Reduced motion may retain essential state transitions but must remove looping,
  parallax, and large spatial animation.

Automated success is necessary but not sufficient. The table above deliberately
remains an explicit production-release responsibility because a code agent
cannot truthfully certify real screen-reader comprehension without an assisted-
technology session.
