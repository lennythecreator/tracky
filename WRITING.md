# Tracky writing guide

Use this guide for the website, README, product documentation, examples, release notes, and developer-facing messages. `product.md` remains the source of truth for product scope and status; this guide sets the way we explain it.

## Audience

Write for React developers and small product teams. They know common React and JavaScript concepts, but they might not know Tracky's event model or what an analytics SDK does differently from a hosted analytics service.

Help readers quickly answer:

1. What does Tracky do today?
2. What do I need to configure or own?
3. What data does it send, and what does it leave out?
4. What should I do next?

## Voice

- Be direct, calm, useful, and technically precise. Sound like a developer explaining a tool to another developer.
- Address the reader as **you** when describing their choices or next steps.
- Use active voice and name the actor: the app calls `track()`, Tracky batches events, and the configured endpoint receives them.
- Prefer specific verbs such as **send**, **configure**, **track**, **exclude**, and **retry** over vague verbs such as **handle**, **enable**, or **provide** when the specific action is known.
- Use familiar words, but keep standard technical terms that help developers be precise. Explain Tracky-specific terms the first time they matter.
- Avoid hype, inflated claims, filler, rhetorical questions, and vague phrases such as “seamless,” “powerful,” and “unlock insights.”

## Message order

Lead with the developer's task or the product's current behavior. Then explain the benefit, the developer's choices, and the next step. Put limitations beside the claims they qualify.

Keep current behavior separate from roadmap direction:

- Describe the analytics SDK as an early-development scaffold. Do not imply that it is published or ready to install from npm.
- Describe the reusable React component library as **planned** until it exists. Do not imply that its mockups are working components.
- Keep the destination explicit: developers configure the endpoint, and that endpoint owns validation, storage, dashboards, access controls, and retention.

## By content type

### Landing page

- Say what the current SDK does and where events go in the first screen.
- Distinguish planned components from the current SDK beside each relevant claim.
- Use the workflow diagram to make the app → SDK → endpoint responsibilities clear.
- Give each section one job. Do not repeat the hero in new words.
- Use action links that tell developers where they will go, such as **Explore the SDK setup** or **See the event schema**.

### README and quick starts

- Start with prerequisites and the first useful result.
- Show the smallest accurate example, then explain its important options and expected event shape.
- Keep examples aligned with the current exports, defaults, types, and endpoint payload.
- State when an example is illustrative, incomplete, or not yet runnable because the package is unpublished.

### Guides and API reference

- Organize guides around a developer task and show steps in the order they perform them.
- Document parameters, defaults, types, side effects, browser requirements, and failure behavior where the reader needs them.
- Use reference pages for exact behavior; use guides for choosing and completing a task.
- Do not explain standard React concepts unless a Tracky-specific detail changes how they apply.

### Release notes and developer messages

- Lead with what changed and who needs to act.
- State compatibility or migration impact plainly.
- Separate shipped changes from proposals and planned work.

## Style and terminology

- Keep one main idea per sentence and paragraph. Prefer short sentences and descriptive headings.
- Use **Tracky** for the product, **analytics SDK** or **SDK** for the package implemented in the current scaffold, and **component library** for the planned UI package. Do not imply that either package is publicly released.
- Use **event** for one record, **batch** for a group of events sent together, **context** for developer-supplied metadata, and **endpoint** for the URL the developer configures.
- Format API names and code values as code: `AnalyticsProvider`, `useAnalytics()`, `analytics.track()`, `eventType`, `sessionId`, and `data-analytics="ignore"`.
- Use sentence case for headings and controls. Keep code identifiers, event names, and schema keys in their exact casing.
- Prefer concrete examples such as `report_exported` and `format: 'csv'`. Label sample data as illustrative.

## Product and privacy claims

Check `product.md`, `README.md`, and `src/` before adding or changing a technical claim.

- Page-view and automatic interaction capture are off by default. Describe them as opt-in.
- Tracky does not read or send field values, keystrokes, password data, editable text, or arbitrary page text.
- Preserve the `data-analytics="ignore"` exclusion behavior in explanations and examples.
- Custom context is developer-supplied metadata. Never suggest adding secrets or personal data to it.
- Tracky sends to the configured endpoint. Do not suggest that Tracky hosts a collector, database, dashboard, consent manager, or guaranteed-delivery queue.
- Delivery retries are bounded. Durable storage and guaranteed delivery belong to the receiving endpoint.
- Do not describe licensing verification as implemented or make event delivery depend on it.

## Before publishing

- [ ] Can a React developer identify what Tracky does now, what is planned, and what to do next?
- [ ] Are the app, SDK, and endpoint responsibilities clear?
- [ ] Do technical claims match the source, README, and product record?
- [ ] Are defaults, privacy boundaries, and limitations stated accurately and near the related claims?
- [ ] Are examples accurate, minimal, and labeled when illustrative?
- [ ] Does each heading and link make sense when skimmed or read out of context?
- [ ] Have repeated phrases, jargon without a purpose, and unsupported promises been removed?

## References

- [Developer-copy research and checklist](website/research/developer-copywriting.md)
- [Google developer documentation style guide](https://developers.google.com/style)
- [Google Technical Writing One](https://developers.google.com/tech-writing/one)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide)
