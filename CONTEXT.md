# Tracky domain

Tracky is a React analytics SDK plus a source-installed component library: the app it measures, the events those measurements produce, and the endpoint that receives them. This file records the words the project uses for those things and the words it does not. It is a glossary, not a specification; `product.md` and `analytics-design.md` define behavior.

## Language

### Events and delivery

**Event**:
One record of something that happened in the integrating app, sent to the endpoint as a single object in the documented envelope.
_Avoid_: hit, ping, beacon, log line, metric.

**Event type** (`eventType`):
The stable name that says what happened, such as `pageview`, `click`, `component_interaction`, or a developer-defined name.
_Avoid_: event name (that is the explicit analytics name), action, kind, category.

**Context** (`context`):
The flat, JSON-safe object of small developer-supplied metadata and safe target metadata that travels with one event.
_Avoid_: properties, props, metadata, attributes, user data.

**Payload** (`payload`):
The JSON-safe structured value an event carries when flat context is not enough, with one concrete type per structured event.
_Avoid_: body, data, summary, structured context.

**Component** (`component`):
The `{ name, action }` pair on a component event that says which primitive or application component was used and what the person did with it.
_Avoid_: component metadata, component context, element.

**Session** (`sessionId`):
The lifetime of one browser tab, identified by a random ID that is not shared across tabs and not kept beyond the session.
_Avoid_: visit, user, visitor, account, identity.

**Visit** (`visitId`):
One continuous stay on one accepted route, which is the measuring scope for heat maps and scroll depth.
_Avoid_: session, page view, route.

**Route**:
The path plus query string recorded as `route` on a page view, heat map, or scroll depth event.
_Avoid_: URL, pathname, page, location.

**Location**:
The browser's current address, which the route resolver either turns into a route or refuses.
_Avoid_: route, URL, path.

**Route resolver** (`resolveRoute`):
The developer-supplied function that decides which locations count as routes and what each one is called.
_Avoid_: router, adapter, middleware, route mapper.

**Ignored location**:
A location the resolver refuses by returning `null`; it is not a route visit, so nothing is measured for it and its activity is never attributed to a later route.
_Avoid_: empty route, null route, blank route, skipped page, hidden route.

**Endpoint**:
The URL the integrator configures to receive batches, and the component that owns validation, storage, retention, access, and guaranteed delivery.
_Avoid_: collector, backend, server, destination, sink, vendor.

**Batch**:
The events sent together in one request to the endpoint.
_Avoid_: queue, chunk, payload.

**Flush**:
Sending the currently buffered events now instead of waiting for the batch to fill or the timer to elapse.
_Avoid_: send, commit, sync, drain.

**Buffer**:
The events held in memory between being tracked and being sent, bounded so a stalled endpoint cannot grow it without limit.
_Avoid_: queue, backlog, spool, cache.

**Bounded retry**:
A fixed, limited run of attempts to resend a failed batch, after which the failure is reported and those events are dropped.
_Avoid_: guaranteed delivery, durable queue, at-least-once, exactly-once.

### Capture

**Page-wide capture**:
Automatic capture of what happens across the whole page, as opposed to the action of one component, and off until the integrator turns it on.
_Avoid_: tracking, auto tracking, global tracking, telemetry, instrumentation.

**Capture switch**:
One independent on/off choice for one page-wide capture category; each stays off until the integrator enables it.
_Avoid_: flag, toggle, setting, option.

**Analytics name** (`data-analytics-name`):
A stable label the integrator attaches to a control so events from its different rendered instances group together.
_Avoid_: event name, label, id, selector, key.

**Frustration click**:
Three or more clicks on the same element within one second, recorded as its own event type when that switch is on.
_Avoid_: rage click, repeated click, dead click.

**Heat map**:
A per-visit summary of where pointer time, clicks, and keyboard focus landed on a fixed grid of the visible viewport.
_Avoid_: cursor trail, mouse track, session replay, click map.

**Scroll depth**:
How far down the page a visit has reached, rounded down to the nearest 25% bucket.
_Avoid_: scroll position, scroll percent, read depth.

**Exclusion boundary** (`data-analytics="ignore"`):
A page subtree whose interactions Tracky never captures, including everything inside it.
_Avoid_: blocklist, opt-out, do-not-track, filter.

### Product surfaces

**SDK**:
The runtime package the integrating app imports: the provider, the hook, and the capture behavior behind them.
_Avoid_: library, framework, plugin, the package.

**Component library**:
The React primitive source that `tracky add` copies into the integrating app, shipped as source rather than exported by the SDK.
_Avoid_: package, design system, kit, the SDK.

**Primitive**:
One of the initial seven source-owned React components the component library provides.
_Avoid_: widget, control, element, atomic.

**Documented action**:
A primitive's fixed `{ name, action }` pair, emitted when the person performs that component's normal interaction, such as `button` `activate`, `checkbox` `toggle`, or `select` `change`.
_Avoid_: click, interaction, gesture, usage, event name.

**Integrator**:
The developer who installs Tracky, configures the endpoint, and decides the consent policy.
_Avoid_: user (the person using the app), customer, client, consumer, host.

**Playground**:
The website page that renders the registry source for each primitive and shows the action it produced.
_Avoid_: demo, sandbox, example app, storybook.

**Event preview**:
The playground panel that intercepts the SDK's request inside the page and shows the event a primitive produced without sending it anywhere.
_Avoid_: inspector, devtools, dashboard.

### Registry and CLI

**Registry**:
The committed tree of installable item payloads the CLI fetches from, and the single source for what `tracky add` can install.
_Avoid_: package manager, npm, catalog, marketplace, store.

**Registry item**:
One named unit in the registry, of type `ui`, `lib`, or `theme`.
_Avoid_: package, module, component (the theme and the shared helper are not components).

**Install**:
Copying a registry item's source into the integrating app and recording it in the lockfile.
_Avoid_: add, download, npm install, pull in.

**Project config** (`tracky.json`):
The file `tracky init` writes to record where components, the shared helper, the stylesheet, and the alias live in one app.
_Avoid_: settings, manifest, config file.

**Alias** (`alias`):
The import prefix an app uses for local modules together with the project-relative directory it resolves to, checked against the app's tsconfig.
_Avoid_: path mapping, import path, baseUrl, prefix.

**Ref**:
The branch, tag, or commit the CLI installs registry items from.
_Avoid_: version, revision, tag, branch.

**Lockfile** (`tracky.lock.json`):
The record of which registry items are installed, which files belong to each, and the ref they came from.
_Avoid_: manifest, state, cache, node_modules.
