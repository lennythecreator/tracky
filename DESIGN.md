---
name: Tracky
description: A calm, developer-owned route for product events.
colors:
  primary: "#28669f"
  primary-deep: "#1d4f7c"
  accent: "#3e7fb7"
  neutral-bg: "#ffffff"
  surface-blue: "#f1f7fd"
  surface-pale: "#f8fbff"
  ink: "#15324f"
  ink-muted: "#4e6a84"
  line: "#d9e6f2"
  code: "#142f4b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(2.9rem, 5.3vw, 5.4rem)"
    fontWeight: 700
    lineHeight: 0.99
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "13px"
    padding: "14px 18px"
  button-secondary:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.ink}"
    rounded: "12px"
    padding: "12px 16px"
---

## Overview

**Creative North Star: “The Clear Route.”** Tracky pairs an in-development React component library with an analytics SDK for developers who want useful product signals while keeping control of where those signals go. Its interface should feel precise, open, and trustworthy. The SDK exists in the current scaffold; the component library is still in development.

Soft blue marks the event path and active choices. White space keeps the page readable. A routing diagram is the visual signature; explanatory copy and code show what the SDK does without implying hosted infrastructure.

**Key Characteristics:**
- Blue routing lines and nodes make the data path legible.
- Plus Jakarta Sans gives headings and body copy one consistent voice.
- Dark, restrained code panels distinguish implementation examples from marketing copy.

## Colors

Use white for the main canvas and pale blue for diagram and event-example surfaces. Primary blue identifies the main action and route. Keep body copy in the dark navy palette for contrast. The event diagram is illustrative and should remain labeled as such.

## Typography

Use the self-hosted Plus Jakarta Sans files in `website/fonts/` for headings, prose, and code. Headings are bold with modest negative tracking; avoid compressed letter spacing. Code samples, paths, and event data use the same family so the page keeps one voice; rely on the code panel's background, padding, and syntax colour for separation instead of a second typeface.

## Layout

The page uses a centered content column up to 1160px. At desktop widths, pair the hero message with the event-path poster. At tablet and mobile widths, stack them and preserve the React → Tracky → endpoint sequence. Keep code examples horizontally scrollable rather than shrinking them until unreadable.

## Elevation & Depth

Prefer clear surface color and a fine blue-gray border. Use soft, low-opacity shadows only for the primary action and floating navigation. Avoid decorative blur beyond the sticky header material.

## Shapes

Use 12–16px corners for controls and content panels, with a slightly larger radius on the route poster. Keep controls comfortably tappable and provide a visible keyboard focus ring.

## Components

- **Primary action:** solid blue button with white text, a subtle shadow, and a small lift on hover.
- **Route poster:** pale-blue surface containing a Tracky UI component, the analytics SDK, and a developer endpoint linked by a simple SVG route. Label this path as a concept preview.
- **Component preview:** one composed app surface paired with an illustrative event list. Keep the component library's in-development status and unreleased state explicit.
- **Code panels:** dark navy for the quick-start snippet; white for the example event payload.
- **Capability rows:** icon, heading, explanation, and a short metadata label separated by thin rules.

## Do's and Don'ts

- Do make the configured endpoint and developer-owned data path clear.
- Do label example data and animated route behavior as illustrative.
- Do keep opt-in capture and privacy boundaries accurate to the product implementation.
- Don't imply Tracky provides a collector, dashboard, durable queue, consent manager, or guaranteed delivery.
- Don't add gradients, generic feature-card grids, or unsupported performance claims.
