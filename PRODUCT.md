# Product

## Register

product

## Users

AdonisJS developers who are building or debugging notification flows in local development and staging. They use this dashboard between writing code and running tests: they want to confirm that notifications were queued, sent, failed, or read without wading through logs or database queries. They are comfortable with code, short on time, and suspicious of UI fluff.

## Product Purpose

The notification dashboard is a read-and-control surface for the `@rikology/adonisjs-notifications` package. It shows delivery metrics across channels and statuses, and it lets a developer inspect and manage a single notifiable's inbox. Success means a failing delivery is spotted in under three seconds, and a single notification's payload is reachable in one click.

## Brand Personality

Capable, calm, craftsmanlike.

The package sells itself through ergonomics and clean APIs; the dashboard should feel like a natural extension of that code: predictable, well-typed, and never louder than the data. There is no marketing here. Every pixel should answer a developer's question.

## Anti-references

- Generic Bootstrap-style admin dashboards with thick borders, giant stat cards, and side-stripe "status" accents.
- Observability UIs that default to dark mode just because the category expects it.
- SaaS landing-page dashboards that lead with a huge vanity number and a gradient.
- Tables that show every column at once with no visual hierarchy.
- Glassmorphism, gradient text, or animated entrance choreography on a tool screen.

## Design Principles

- **Data first, decoration never.** Every visual element must justify itself by making a metric, status, or action clearer.
- **Density with hierarchy.** Show a lot of deliveries at once, but make failures and unread items impossible to miss.
- **Respect the developer's time.** Load fast, keep interactions under 250 ms, and reveal detail only on demand.
- **One accent, one action.** The primary action color is reserved for the current path and primary buttons. Semantic colors support, they do not compete.
- **Motion is state change, not decoration.** Transitions only happen for hover, focus, active, loading, expand, and delete feedback.

## Accessibility & Inclusion

- Target WCAG 2.1 AA for text contrast and interactive target sizes.
- Never rely on color alone for status; pair every status indicator with an icon and label.
- Honor `prefers-reduced-motion` by disabling non-essential transitions.
- Keyboard-navigable lists, buttons, and pagination.
