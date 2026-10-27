# Landing-page diagrams and animated product flows

**Research date:** 2026-10-26  
**Scope:** How modern AI/SaaS sites explain a product with diagrams or animated flows, and what implementation fits Tracky.

## What “the diagram thing” usually is

There are two related patterns:

1. **A product explainer diagram:** a composed visual (cards, labels, connectors, arrows) that explains the product at a glance. It may have subtle motion but does not behave like an editor.
2. **A workflow canvas/demo:** a real interactive graph with draggable nodes, connectable edges, pan/zoom, run state, or editable input. This is useful when the graph itself is the product or visitors need to try it.

The AI examples reviewed range from visual workflow builders (OpenAI’s Agent Builder guide describes a canvas where people assemble nodes and preview runs; Vercel’s Tersa template identifies React Flow as its canvas implementation) to product pages that mix code samples, interactive playgrounds, and product-family diagrams (Vercel AI SDK). This suggests “AI landing page diagrams” are often authored product illustrations or focused interactive demos; there is no single required framework or canonical diagram widget. [OpenAI Agent Builder guide](https://developers.openai.com/api/docs/guides/agent-builder), [Vercel Tersa template](https://vercel.com/templates/next.js/tersa-ai-workflow-canvas), [Vercel AI SDK page](https://vercel.com/ai-sdk)

## Common visual recipe

- **Show a concrete input and output.** A person should understand what enters the system, what the product does, and where the result goes without reading every label.
- **Make the product the central transformation.** Use a small number of nodes with directional connectors; labels clarify what each stage does.
- **Add evidence of activity sparingly.** A connector drawing in, one traveling event dot, or one node changing state gives the diagram life. Avoid making every card bob, pulse, and glow at once.
- **Keep the diagram legible when still.** Motion should reinforce the route, not be required to understand it. This also preserves the message in reduced-motion mode and when animation is paused or not yet started.
- **Use UI-like cards rather than a screenshot collage.** Small interface details can make the picture tangible, but labels and hierarchy should remain readable at mobile sizes.

These are design observations and recommendations synthesized from the examples, not claims that the referenced companies all use the same implementation.

## Implementation approaches

| Approach | Good fit | Trade-offs |
| --- | --- | --- |
| Inline SVG with HTML cards | A fixed, branded product route or architecture illustration | Precise responsive control; crisp at every scale; easy to pair with CSS; manually define path geometry. Best fit for a landing-page explainer. |
| CSS-only layout/connectors | A very simple linear sequence | Minimal runtime; responsive HTML cards are straightforward. Curved or branching routes become awkward and brittle. |
| SVG plus CSS or Motion | A fixed diagram with line drawing, moving dots, or state emphasis | Paths map cleanly to connectors; Motion for React supports animating SVG attributes and path-drawing progress. Adds a dependency if Motion is not already present. |
| Canvas/WebGL | Dense, continuously changing, or particle-heavy visualizations | Useful for high-volume graphical effects; less convenient for accessible semantic labels, focus, text selection, and responsive card layout. Too much for a small SDK flow. |
| React Flow (`@xyflow/react`) | A true user-editable graph: drag, connect, pan/zoom, node state | Provides graph interactions, custom nodes/edges and edge animation examples, but adds a substantial interaction surface and dependency. Its docs include hundreds-of-nodes stress tests and note rendering options for visibility; that is editor infrastructure, not needed for a fixed hero illustration. |
| Lottie/Rive/video asset | A designed, non-interactive sequence with art direction | Can be authored outside code and replayed, but adds asset/runtime and editing workflow; interactive labels/layout and reduced-motion control need consideration. |

Official references: [React Flow feature and animation examples](https://reactflow.dev/examples), [React Flow component/API](https://reactflow.dev/api-reference/react-flow), [Motion SVG animation](https://motion.dev/docs/react-svg-animation), [MDN CSS motion paths](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Motion_path), [MDN SVG `stroke-dasharray`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dasharray), [MDN `stroke-dashoffset`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/stroke-dashoffset).

## A practical build pattern

For a static flow, lay out semantic HTML cards in CSS Grid/Flexbox and put an absolutely positioned inline SVG behind them for the connectors. Use a shared `viewBox`, `preserveAspectRatio`, and paths aligned to the same layout. On mobile, either keep a readable left-to-right route at a smaller scale or deliberately reflow to a vertical route with a separate path layout; avoid shrinking the entire desktop graphic until labels are unreadable.

To animate a route, keep a muted base path and animate a second, brighter stroke with `stroke-dasharray` / `stroke-dashoffset`, or move a small dot along an SVG path. Trigger once on entry or replay on a deliberate user action. If using Motion, its SVG `pathLength` supports line-drawing effects. Keep all essential meaning in visible text and labels.

Use the platform preference `prefers-reduced-motion` to stop the moving dot, path drawing, and nonessential looping. The W3C describes the preference as a request to minimize nonessential motion; MDN demonstrates adapting animation in CSS. [W3C Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion), [MDN accessibility media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility), [WAI technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html).

## Recommendation for Tracky

Use the existing **event-path poster** concept: **React app → Tracky SDK → developer-configured endpoint**. Add a small event card entering the SDK, a single batched event packet leaving it, and a clearly labeled endpoint card. Beneath/near the endpoint, a short note can say the customer owns storage and dashboards. The visual should convey the boundary that Tracky sends to the configured endpoint and does not host analytics infrastructure.

Build it as a **dependency-free inline SVG plus HTML**, with a static readable baseline and one restrained route animation. The website is currently a dependency-free static landing page (`website/README.md`) and the repo’s surface note already chooses an event-path poster; a full React Flow editor would solve a different problem and pull the page away from its small, direct explanation. Retain the diagram when animation is disabled, respect reduced motion, and ensure the path labels remain understandable on mobile.

Product-specific guardrails:

- Mark moving packets as an illustration; they are not a live data connection or a real request.
- Do not imply Tracky hosts the endpoint, collector, database, or dashboard.
- Don’t depict automatic capture as always on; label it as optional/opt-in if shown.
- Don’t show field values or page text in the sample event. Use safe metadata such as event name, route, timestamp, and context placeholder.
- Don’t imply guaranteed delivery: the configured endpoint owns durable storage and the SDK uses bounded delivery/retry behavior.

## Sources

- [OpenAI Agent Builder guide](https://developers.openai.com/api/docs/guides/agent-builder) — visual canvas concepts, node-based assembly, previewing runs. The page currently notes deprecation, so this is used as a visual-product example, not a recommendation to build on that product.
- [Vercel AI SDK landing page](https://vercel.com/ai-sdk) — current SDK landing page presentation, interactive playground/code examples, ecosystem products.
- [Vercel Tersa template](https://vercel.com/templates/next.js/tersa-ai-workflow-canvas) — a real AI workflow canvas explicitly built with React Flow.
- [React Flow examples](https://reactflow.dev/examples) and [ReactFlow API](https://reactflow.dev/api-reference/react-flow) — official graph editor and edge examples/API.
- [Motion SVG animation docs](https://motion.dev/docs/react-svg-animation) — React SVG attribute, path drawing, and path motion options.
- [MDN CSS motion path guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Motion_path), [SVG stroke dasharray](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dasharray), and [stroke dashoffset](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/stroke-dashoffset) — browser primitives for path-following and animated strokes.
- [W3C Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion), [MDN accessibility media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility), and [WAI C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html) — reduced-motion behavior.
