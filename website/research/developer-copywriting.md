# Writing for Tracky’s developer audience

Research notes for improving Tracky’s landing page and developer communications. Reviewed the current [landing-page source](../index.html), [product boundary](../../product.md), and [README](../../README.md) on October 26, 2026.

## Findings from primary sources

- **Write for a specific task and reader.** Microsoft recommends identifying who the customer is and what they are trying to do before writing. Its developer-content guidance says developers can be assumed to know programming basics; spend words on product-specific behavior and decisions instead. [Microsoft content planning](https://learn.microsoft.com/en-us/style-guide/content-planning) · [Developer content](https://learn.microsoft.com/en-us/style-guide/developer-content/)
- **Make one point at a time.** Google’s technical writing course recommends one idea per sentence, removing filler, and turning multi-part procedures into steps. Its paragraph guidance says to keep paragraphs about one idea and put the key point first. [Google: short sentences](https://developers.google.com/tech-writing/one/short-sentences) · [Google: paragraph structure](https://developers.google.com/style/paragraph-structure)
- **Prefer clear actors and verbs.** Google recommends active voice so readers know whether the developer, SDK, browser, or server performs an action. [Google: active voice](https://developers.google.com/style/voice)
- **Put the useful information where skimmers will see it.** GOV.UK advises front-loading page content and headings, using descriptive task-oriented headings, lists for grouped information, and avoiding repeated summaries. [GOV.UK: clear structure](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-structure/)
- **Keep technical language precise, not artificially simplified.** Microsoft recommends everyday wording while remaining technically accurate, concise examples tied to real developer tasks, and accurate code examples developers can copy and run. [Microsoft style quick start](https://learn.microsoft.com/en-us/contribute/content/style-quick-start) · [Microsoft: code examples](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples)
- **Use familiar words and a consistent voice.** Microsoft describes its voice as warm, relaxed, crisp, and helpful; consistency and plain language also make technical content easier to scan and localize. [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide)
- **Show the developer’s choices explicitly.** Stripe’s docs distinguish hosted checkout from embedded checkout and invite readers to compare them; the API reference explains request formats, auth, and limitations near where developers need them. The Tracky-specific takeaway is an inference from those examples: explain who owns each step and make integration boundaries visible. [Stripe quickstarts](https://docs.stripe.com/payments/checkout/quickstarts) · [Stripe API reference](https://docs.stripe.com/api)

## Tracky landing-page implications

The landing page already communicates the developer-owned endpoint, opt-in capture, field-value exclusion, and early-development status. The main copy opportunity is to make the first screen say plainly what can be used today versus what is planned. The product record says the SDK workflow exists in the scaffold, while the reusable component library is future direction and is not implemented. This boundary should remain explicit wherever the page pairs “component library” and “SDK.”

Recommended copy direction:

- Lead with the current, concrete job: **“Track product events from React and send them to your endpoint.”** This is clearer about present capability than “Build the UI. Understand its signals.”
- Follow with a short ownership sentence: **“Tracky is an opt-in React analytics SDK. You choose the endpoint; it receives event batches.”**
- Mark roadmap language at the claim itself: **“A reusable React component library is planned; it is not available yet.”** Avoid a hero promise that makes the component library sound shipped, then relying on a later caveat to correct it.
- Make the event path’s actors explicit: **“Your app calls `track()`. Tracky batches the event and POSTs it to your configured endpoint. Your endpoint validates and stores it.”** Keep diagram labels consistent with this contract.
- Replace broad or decorative phrases when the adjacent detail can be more concrete. For example, “measure meaningful moments” can become “name events such as `report_exported`”; “Delivery that stays out of the way” can become “Tracky sends batches asynchronously and retries failed requests a limited number of times.”
- Keep code examples aligned with the actual API, clearly label example values, and show the smallest useful task. The current example enables page views but not interaction capture; ensure nearby text does not imply otherwise.
- Use descriptive action links such as **“Read the quick start”** or **“See the event format.”** Keep a primary CTA tied to the next step a developer can actually complete in the early-development state.

These are editorial recommendations, not a rewrite of the page. Verify every capability statement against `src/`, `README.md`, and `product.md` before publishing; in particular, do not imply a hosted collector, dashboard, guaranteed delivery, consent management, or shipped component package.

## Reusable checklist

### For landing-page copy

- [ ] Can a React developer identify the product, current capability, and next step from the first screen?
- [ ] Does each claim distinguish shipped SDK behavior from planned component-library direction?
- [ ] Does the copy name the developer’s endpoint as the destination and explain what the endpoint must do?
- [ ] Are actors clear: what the app does, what Tracky does, and what the endpoint owner does?
- [ ] Are privacy statements concrete and consistent: collection is opt-in; automatic capture is off by default; field values are never read or sent?
- [ ] Are headings descriptive and front-loaded, and can a reader understand the page by scanning only headings and links?
- [ ] Does each section add information instead of repeating the hero promise?
- [ ] Are examples realistic, short, accurate, and explicitly illustrative where applicable?
- [ ] Are limitations and prerequisites next to the claims they qualify?
- [ ] Do CTA labels say what happens when clicked?

### For developer communications and docs

- [ ] State the reader’s task and expected result before background detail.
- [ ] Use one main idea per sentence and paragraph; use numbered steps for procedures.
- [ ] Prefer active voice and name the actor, especially across app, SDK, browser, and server boundaries.
- [ ] Use product terms consistently (`event`, `context`, `endpoint`, `batch`, `sessionId`); format code identifiers as code.
- [ ] Define Tracky-specific terms, but do not explain standard React concepts to a React audience.
- [ ] Show the minimal working example, prerequisites, and expected result.
- [ ] Explain important failure cases and ownership (for example, endpoint validation and durable storage).
- [ ] Remove filler, vague superlatives, and unsupported guarantees.
- [ ] Check every technical statement against the implementation and current product record.
- [ ] Ask a developer unfamiliar with Tracky to paraphrase the data path and install steps; revise where their understanding differs from the intended behavior.

## Sources

- [Google Technical Writing One: Short sentences](https://developers.google.com/tech-writing/one/short-sentences)
- [Google developer documentation style guide: Paragraph structure](https://developers.google.com/style/paragraph-structure)
- [Google developer documentation style guide: Active voice](https://developers.google.com/style/voice)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide)
- [Microsoft Learn: Style quick start](https://learn.microsoft.com/en-us/contribute/content/style-quick-start)
- [Microsoft Style Guide: Developer content](https://learn.microsoft.com/en-us/style-guide/developer-content/)
- [Microsoft Style Guide: Code examples](https://learn.microsoft.com/en-us/style-guide/developer-content/code-examples)
- [GOV.UK: Create a clear structure for your content](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-structure/)
- [Stripe Checkout quickstarts](https://docs.stripe.com/payments/checkout/quickstarts)
- [Stripe API reference](https://docs.stripe.com/api)
