# Mechi.club Kenya Page - Figma Background Details

Source page: `https://mechi.club/ke`
Screenshot context: desktop viewport, dark theme, PlayMechi Weekend Cup hero.

## Visual Direction

The page background is a dark esports-style stage: deep navy at the base, teal glow from the upper-left, subtle red/coral glow from the upper-right, and a faint technical grid overlay. The design should feel premium, competitive, and focused, with the hero text floating on a wide dark arena surface rather than inside a card.

## Figma Frame Setup

- Desktop frame: `1920 x 1080`
- Actual web content starts below browser chrome in the screenshot, but for Figma use a clean page frame.
- Suggested page frame fill:
  - Base: `#0B1121`
  - Top blend: `#09101B`
  - Left cast: very dark teal/navy, approx `#061F28`
  - Right cast: very dark purple/near-black, approx `#130D19`

## Background Layer Stack

Create these layers from bottom to top.

### 1. Base Vertical Fill

Use a vertical linear gradient:

```text
Top:    #09101B
Bottom: #0B1121
```

Figma:

- Layer name: `BG / Base Night`
- Fill: Linear, 180 degrees
- Stop 0 percent: `#09101B`
- Stop 100 percent: `#0B1121`

### 2. Horizontal Color Wash

Add a full-frame rectangle above the base.

```text
Left:   rgba(6, 31, 40, 0.72)
Center: rgba(9, 16, 27, 0.35)
Right:  rgba(19, 13, 25, 0.76)
```

Figma:

- Layer name: `BG / Teal To Violet Wash`
- Fill: Linear, 90 degrees
- Stop 0 percent: `#061F28`, opacity `72%`
- Stop 48 percent: `#09101B`, opacity `35%`
- Stop 100 percent: `#130D19`, opacity `76%`

### 3. Upper-Left Teal Glow

Use an ellipse or radial gradient.

```text
Color: #32E0C4
Opacity: 8-10%
Position: x -120, y -120
Size: 720 x 520
Blur: 120-160
```

Figma:

- Layer name: `Glow / Brand Teal`
- Fill: `#32E0C4`
- Opacity: `10%`
- Effect: Layer blur `140`
- Blend mode: `Normal` or `Screen`

### 4. Upper-Right Coral Glow

Use an ellipse or radial gradient.

```text
Color: #FF6B6B
Opacity: 7-8%
Position: x 1400, y -140
Size: 700 x 520
Blur: 140-170
```

Figma:

- Layer name: `Glow / Coral Right`
- Fill: `#FF6B6B`
- Opacity: `8%`
- Effect: Layer blur `150`
- Blend mode: `Normal` or `Screen`

### 5. Optional Blue Hero Glow

This helps the blue registration pill and blue headline segment feel grounded.

```text
Color: #2563EB
Opacity: 5-7%
Position: center x 960, y 380
Size: 700 x 360
Blur: 160
```

Figma:

- Layer name: `Glow / Hero Blue`
- Fill: `#2563EB`
- Opacity: `6%`
- Effect: Layer blur `160`

### 6. Technical Grid Overlay

The codebase uses a faint grid over the page background.

```text
Grid line color: rgba(130, 149, 176, 0.025 to 0.03)
Grid size: 64px or 72px
Mask: strongest near top, fading by about 70% page height
Overall opacity: about 34%
```

Figma:

- Layer name: `BG / Technical Grid`
- Create 1 px horizontal and vertical strokes repeated every `64` or `72` px.
- Stroke color: `#8295B0`, opacity `3%`
- Group opacity: `34%`
- If possible, mask with a top-centered radial or vertical fade.

## Official Theme Tokens

Use these values when reconstructing the page.

| Token | Value | Use |
| --- | --- | --- |
| `--page-bg` | `#0B1121` | Main page night background |
| `--page-bg-alt` | `#09101B` | Top/deeper background |
| `--surface` | `rgba(14, 22, 38, 0.84)` | Panels/cards |
| `--surface-strong` | `#111B2E` | Strong panel fill, inner badge |
| `--surface-soft` | `rgba(17, 27, 46, 0.76)` | Floating header fill |
| `--surface-elevated` | `#152033` | Raised controls |
| `--text-primary` | `#F8FBFD` | Main hero/nav text |
| `--text-secondary` | `#B9C4D2` | Body/subtitle text |
| `--text-soft` | `#7B879A` | Breadcrumb muted text |
| `--border-color` | `rgba(226, 232, 240, 0.08)` | Soft borders |
| `--border-strong` | `rgba(226, 232, 240, 0.14)` | Active/hover borders |
| `--brand-teal` | `#32E0C4` | Brand accent |
| `--accent-secondary-text` | `#8EF2E4` | Dashboard button text |
| `--brand-coral` | `#FF6B6B` | Warm brand accent |
| Blue CTA | `#2563EB` | Registration pill background |
| Blue CTA border | `#BFDBFE` | Registration pill border |
| Red-orange gradient | `#EF4444` to `#F97316` | Prize pool headline |
| Blue gradient | `#60A5FA` to `#2563EB` | Entry price headline |

## Header Background Details

The floating nav is a glassy rounded shell.

```text
Approx screenshot position: x 210, y 38 inside page, width 1490, height 74
Radius: 32px
Fill: rgba(17, 27, 46, 0.76)
Border: rgba(226, 232, 240, 0.08), 1px
Backdrop blur: 20-24px
Shadow: 0 14 36 rgba(0, 0, 0, 0.28)
```

Add a thin horizontal glow behind the header:

```text
Height: 1px
Width: full viewport
Gradient: transparent -> rgba(50,224,196,0.28) -> transparent
Position: vertically centered behind nav shell
```

Header contents:

- Logo: left, about `44 x 44`, symbol only.
- Main nav: uppercase Montserrat, heavy weight, tracking `0.14em to 0.16em`.
- Nav labels visible in screenshot: `TOURNAMENTS`, `PLATFORM`, `REGISTER`, `CUP`.
- Right controls: notification, theme button, dashboard button.
- Dashboard button:
  - Fill: `rgba(17, 27, 46, 0.88)`
  - Border: `rgba(50, 224, 196, 0.32)`
  - Text: `#8EF2E4`
  - Radius: `14px`

## Breadcrumb Background Details

```text
Approx screenshot position: x 222, y 124 inside page
Size: 202 x 52
Radius: 8-10px
Fill: rgba(17, 27, 46, 0.76)
Border: rgba(226, 232, 240, 0.08), 1px
Text muted: #7B879A
Text active: #F8FBFD
Icon/accent: #8EF2E4
```

Breadcrumb copy:

```text
HOME > KE
```

## Hero Area Details

The hero is centered and unframed.

```text
Hero content max width: 1050-1200px
Top spacing from page top: about 260px to badge in screenshot
Alignment: center
No card behind hero text
```

### Latest Badge

```text
Outer pill fill: #2563EB
Outer border: #BFDBFE, 4px
Radius: 999px
Height: about 54px in screenshot
Inner "Latest" pill fill: #111B2E
Inner text: #F8FBFD
Main text: white
```

Copy:

```text
Latest  Weekend Cup Registration Open  ->
```

### Main Headline

Font:

```text
Family: Montserrat
Weight: 800-900
Size: 88-96px for a 1920px desktop Figma mock
Line height: 0.95-1.0
Letter spacing: 0
Alignment: center
```

Text treatment:

```text
White text: #F8FBFD
Prize gradient: #EF4444 -> #F97316
Entry gradient: #60A5FA -> #2563EB
```

Visible copy from screenshot:

```text
PlayMechi Weekend Cup
Season 1. Total Weekend
Cup prize pool: up to KSh
10,500. 29-31 May 2026. Entry
from KSh 75.
```

Note: the current component source uses `Prize pool up to KSh 10,500.` while the screenshot shows `Total Weekend Cup prize pool: up to KSh 10,500.` Use the screenshot wording for this Figma recreation.

### Supporting Copy

```text
Color: #B9C4D2
Font: Open Sans
Weight: 400-600
Size: 26-30px in screenshot recreation, or 20px if matching source CSS exactly
Line height: 1.4
Max width: 950px
Alignment: center
```

Visible copy from screenshot:

```text
PUBG Mobile, CODM, eFootball, and Free Fire are live for Weekend Cup
Season 1. Pick your game, pay entry, and lock your slot before match day.
```

## Typography

The repo loads:

- Display: `Montserrat`
- Body: `Open Sans`

Recommended Figma styles:

| Style | Font | Size | Weight | Line height | Color |
| --- | --- | ---: | ---: | ---: | --- |
| Hero/H1 Desktop | Montserrat | 92 | 900 | 92 | `#F8FBFD` |
| Hero/H1 Gradient Span | Montserrat | 92 | 900 | 92 | Gradient |
| Nav Label | Montserrat | 18-20 | 800 | 24 | `#F8FBFD` |
| Badge Text | Montserrat/Open Sans | 20-24 | 700 | 28 | `#FFFFFF` |
| Body Large | Open Sans | 28 | 500 | 39 | `#B9C4D2` |
| Breadcrumb | Montserrat | 16 | 800 | 20 | `#7B879A` / `#F8FBFD` |

## Composition Notes

- Keep the page mostly empty above the hero. The power comes from scale and contrast, not decoration.
- Do not put the hero headline in a card.
- Use the background as a full-page atmospheric layer.
- Keep the left side slightly teal and the right side slightly purple/red-black.
- The technical grid should be barely visible. If it is obvious, reduce opacity.
- The nav glass should be visible but not bright. It should sit inside the background, not above it like a white app bar.

## Quick Figma Layer Order

```text
Page / 1920 x 1080
  BG / Base Night
  BG / Teal To Violet Wash
  Glow / Brand Teal
  Glow / Coral Right
  Glow / Hero Blue
  BG / Technical Grid
  Header / Horizontal Glow Line
  Header / Glass Shell
  Header / Logo + Nav + Controls
  Breadcrumb / Shell
  Hero / Latest Badge
  Hero / H1
  Hero / Supporting Copy
```
