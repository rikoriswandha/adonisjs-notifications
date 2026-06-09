# AdonisJS Notifications Execution Plan

## Objective

Implement a production-grade AdonisJS v7 notification package with Laravel-inspired ergonomics, Adonis-native integration, pluggable channels, queued delivery, database inbox support, and strong testing tools.

## Working Rules

- Keep public contracts stable and documented before building optional adapters.
- Build one narrow vertical slice before expanding channels.
- Prefer official Adonis integrations for mail, queue, config, service providers, commands, and tests.
- Keep optional integrations optional through peer dependencies and runtime guards.
- Add tests with each phase; do not leave core behavior untested until the end.
- Treat docs, stubs, and package exports as part of the product.

## Phase 0: Package Identity and Baseline Cleanup

### Tasks

- Rename package from `pkg-starter-kit` to the intended package name.
- Update `description`, `keywords`, `author`, and README title.
- Replace starter README content with package-specific introduction and installation notes.
- Confirm Node.js engine remains `>=24.0.0`.
- Update GitHub Actions Node versions if the workflow still targets old Node releases.
- Add package exports for planned provider, service, channels, testing, and mixin entrypoints.
- Decide package namespace:
  - `@rikology/adonisjs-notifications`
  - `@rikoris/adonisjs-notifications`
  - another scoped name

### Deliverables

- Updated `package.json`.
- Updated `README.md`.
- Export map for planned public modules.

### Acceptance Checks

- `npm run typecheck` passes.
- `npm run lint` passes.
- Package metadata no longer references the starter kit.

## Phase 1: Core Contracts

### Tasks

- Create `src/contracts/config.ts`.
- Create `src/contracts/notifiable.ts`.
- Create `src/contracts/channels.ts`.
- Create `src/contracts/delivery.ts`.
- Create `src/contracts/messages.ts`.
- Create base `src/notification.ts`.
- Define common types:
  - `NotificationChannelName`
  - `NotificationRecipient`
  - `NormalizedNotifiable`
  - `DeliveryContext`
  - `DeliveryResult`
  - `NotificationPreferences`
  - `NotificationQueueOptions`
- Define package exceptions in `src/exceptions/main.ts`.
- Export contracts from stable entrypoints.

### Deliverables

- Typed foundation for notification classes, channels, routing, delivery, and config.

### Acceptance Checks

- Type tests or unit tests prove notification subclasses can implement `via`, `toMail`, and `toDatabase`.
- Invalid missing channel message methods produce package exceptions.
- Public exports compile through `tsdown` and declaration generation.

## Phase 2: Configuration System

### Tasks

- Implement `defineConfig`.
- Implement default config.
- Implement channel factory namespace:
  - `channels.mail`
  - `channels.database`
  - `channels.log`
  - `channels.null`
- Create `stubs/config/notifications.stub`.
- Implement config normalization and validation.
- Add tests for default config and custom channel config.

### Deliverables

- `config/notifications.ts` stub.
- Config helper exports.
- Normalized runtime config used by the manager.

### Acceptance Checks

- Applications can import `defineConfig` and `channels`.
- Missing required config fails with clear errors.
- Optional mail, queue, and Lucid dependencies are not eagerly required unless used.

## Phase 3: Provider and Service Binding

### Tasks

- Create `providers/notification_provider.ts`.
- Register `NotificationManager` as a singleton.
- Add container alias if chosen.
- Create `services/main.ts` that resolves the manager from the Adonis app container.
- Add TypeScript module augmentation for container binding.
- Update `package.json` exports.
- Add provider registration to configure hook later, but keep provider usable manually now.

### Deliverables

- Adonis-native provider integration.
- Service import API.

### Acceptance Checks

- A test can boot an Adonis app and resolve the manager.
- `notifications` service import exposes `send`, `sendNow`, `route`, `fake`, and `restore` methods.
- No optional integration package is required during provider registration.

## Phase 4: Notification Manager Vertical Slice

### Tasks

- Implement `NotificationManager`.
- Implement recipient normalization for:
  - single notifiable
  - array of notifiables
  - route notifiable
- Implement channel selection through `notification.via`.
- Implement channel registry.
- Implement route resolution.
- Implement `send` and `sendNow`.
- Implement `NotificationRouter` for anonymous route notifications.
- Implement lifecycle event emission interface, even if events are initially tested with a fake emitter.

### Deliverables

- End-to-end sync delivery through in-memory channels.

### Acceptance Checks

- Sending one notification to one recipient works.
- Sending one notification to many recipients works.
- Anonymous route notification works.
- Missing route errors identify notification, channel, and recipient.
- Unknown channel errors identify the missing channel.

## Phase 5: Log and Null Channels

### Tasks

- Implement `NullChannel`.
- Implement `LogChannel`.
- Define channel result shape.
- Add channel tests.
- Ensure log channel redacts sensitive route values by default.

### Deliverables

- First working channels without external dependencies.

### Acceptance Checks

- `null` channel records successful no-op delivery.
- `log` channel writes a structured safe log message.
- Core manager can deliver to both channels.

## Phase 6: Mail Channel

### Tasks

- Add optional peer dependency metadata for `@adonisjs/mail`.
- Implement `MailMessage`.
- Implement `MailChannel`.
- Resolve mail route from:
  - `routeNotificationForMail`
  - `routeNotificationFor('mail')`
  - config field mapping such as `email`
  - anonymous route notification
- Support subject, greeting, lines, action, salutation, view, html, text, from, replyTo, cc, bcc.
- Convert `MailMessage` to Adonis mailer calls.
- Add tests with mail fake or channel-level fake.

### Deliverables

- Email notification support through `@adonisjs/mail`.

### Acceptance Checks

- Mail channel builds expected message.
- Missing email route fails clearly.
- Mail channel is not loaded unless configured or used.
- Tests can assert mail delivery without sending real mail.

## Phase 7: Database Channel and Models

### Tasks

- Add optional peer dependency metadata for `@adonisjs/lucid`.
- Implement `DatabaseMessage` type.
- Implement `DatabaseChannel`.
- Create Lucid models:
  - `DatabaseNotification`
  - `NotificationDelivery`
- Create repository contract.
- Implement Lucid repository.
- Implement in-memory repository for tests.
- Add migration stubs:
  - notifications table
  - notification deliveries table
- Add read/seen repository methods.

### Deliverables

- Persistent notification inbox.
- Persistent delivery attempt tracking foundation.

### Acceptance Checks

- Database channel stores `data` JSON.
- Notifications can be listed for a notifiable.
- Notifications can be marked read/unread.
- Notifications can be marked seen.
- Unread count works.
- Tests cover migrations and model behavior.

## Phase 8: Notifiable Mixin

### Tasks

- Implement `Notifies` Lucid mixin.
- Add model instance methods:
  - `notify`
  - `notifyNow`
  - `routeNotificationFor`
- Add relationship helpers where practical:
  - `notifications`
  - `unreadNotifications`
- Add convenience methods:
  - `markNotificationsAsRead`
  - `unreadNotificationsCount`
- Export mixin from a stable subpath.

### Deliverables

- Laravel-style model ergonomics.

### Acceptance Checks

- A Lucid `User` model can call `user.notify(...)`.
- Relationship methods query only that notifiable.
- Mixin does not break models without database notification usage.

## Phase 9: Queue Integration

### Tasks

- Add optional peer dependency metadata for `@adonisjs/queue`.
- Create `SendNotificationJob`.
- Define notification serialization strategy.
- Define notifiable serialization strategy.
- Implement queued delivery dispatch in `NotificationManager`.
- Support:
  - `shouldQueue`
  - `queue`
  - `connection`
  - `delay`
  - retries
  - backoff
- Add idempotency/dedupe key generation.
- Persist pending delivery attempts when delivery tracking is enabled.
- Add tests for queued intent without requiring a real queue worker.

### Deliverables

- Queue-aware notifications.

### Acceptance Checks

- Queued notification does not send immediately.
- Queue payload includes notification, recipient identity, channel, and dedupe key.
- `sendNow` bypasses queue.
- Delays are channel-aware.
- Serialization errors are explicit and actionable.

## Phase 10: Delivery Attempts and Retry Operations

### Tasks

- Implement delivery attempt creation and updates.
- Record statuses:
  - `pending`
  - `sent`
  - `failed`
  - `skipped`
- Record provider message id when available.
- Record structured failure data.
- Implement retry selection query.
- Implement retry behavior for failed delivery attempts.
- Add dedupe protection.

### Deliverables

- Operational delivery tracking.

### Acceptance Checks

- Successful delivery marks attempt as `sent`.
- Failed delivery marks attempt as `failed`.
- Skipped delivery records reason when configured.
- Duplicate dedupe key does not create duplicate delivery attempts.
- Retry only targets eligible failed attempts.

## Phase 11: Preferences and Filtering

### Tasks

- Implement preference resolver contract.
- Apply channel preferences before delivery.
- Apply notification-level `shouldSend`.
- Add quiet-hours support.
- Add priority bypass support.
- Add category filtering support.
- Make skipped deliveries optionally recordable.

### Deliverables

- Recipient-aware channel filtering.

### Acceptance Checks

- Disabled channel is skipped.
- Quiet-hours skip normal notification.
- Critical notification can bypass quiet hours when configured.
- `shouldSend` can prevent delivery for a specific channel.

## Phase 12: Testing Fake and Assertions

### Tasks

- Implement `FakeNotificationManager`.
- Add `notifications.fake`.
- Add `notifications.restore`.
- Add assertions:
  - `assertSent`
  - `assertSentTo`
  - `assertNotSentTo`
  - `assertSentOnChannel`
  - `assertQueued`
  - `assertNothingSent`
- Add callback predicates for advanced assertions.
- Support faking all channels or selected channels.
- Use Adonis container swap/restore patterns.

### Deliverables

- Production-quality test helper API.

### Acceptance Checks

- Tests can fake notifications without database, mail, or queue.
- Assertions produce useful failure messages.
- Restore returns the real manager.
- Selected-channel fake still lets non-faked channels run if configured.

## Phase 13: Ace Commands

### Tasks

- Implement `make:notification`.
- Implement `notifications:prune`.
- Implement `notifications:retry-failed`.
- Optionally implement `notifications:table`.
- Add command stubs.
- Register commands through configure hook and package exports.
- Test command behavior with Japa.

### Deliverables

- Developer tooling for creating and maintaining notifications.

### Acceptance Checks

- `make:notification InvoicePaid` creates expected file.
- `make:notification Billing/InvoicePaid --queued --mail --database` creates selected methods.
- `notifications:prune` deletes eligible rows only.
- `notifications:retry-failed` retries eligible failures only.

## Phase 14: Configure Hook

### Tasks

- Implement `configure.ts`.
- Copy config stub.
- Register provider in `adonisrc.ts`.
- Register commands in `adonisrc.ts`.
- Optionally publish migration stubs.
- Detect optional integrations:
  - mail
  - queue
  - lucid
- Add flags for non-interactive setup.
- Ensure existing files are not overwritten unexpectedly.

### Deliverables

- `node ace configure <package>` support.

### Acceptance Checks

- Configure installs provider and commands.
- Configure publishes config.
- Configure can publish migrations when requested.
- Running configure twice is safe.

## Phase 15: Documentation

### Tasks

- Rewrite README.
- Add installation guide.
- Add configuration guide.
- Add creating notifications guide.
- Add channel guide.
- Add database notifications guide.
- Add queue guide.
- Add testing guide.
- Add custom channel guide.
- Add upgrade notes while pre-1.0 APIs evolve.
- Add examples:
  - invoice paid
  - password changed
  - anonymous support message
  - database inbox
  - queued mail

### Deliverables

- Complete developer docs for initial release.

### Acceptance Checks

- A new user can install, configure, create, send, queue, store, and test a notification using docs only.
- README examples compile against public exports.

## Phase 16: Hardening

### Tasks

- Add concurrency tests around delivery attempt dedupe.
- Add serialization edge case tests.
- Add error redaction tests.
- Add type-level tests where useful.
- Add package export smoke tests.
- Run package build and generated declaration check.
- Verify optional peer dependency behavior in isolated test apps if practical.

### Deliverables

- Release-candidate quality package.

### Acceptance Checks

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- Optional integrations fail gracefully when missing.
- No starter-kit text remains in public docs.

## Phase 17: Release Preparation

### Tasks

- Decide initial version number.
- Add changelog.
- Confirm `files` includes all built public assets.
- Confirm `exports` includes all supported subpaths.
- Confirm package provenance settings.
- Add examples or fixture app if needed.
- Tag pre-release.

### Deliverables

- Publishable package release candidate.

### Acceptance Checks

- `npm pack --dry-run` contains only intended files.
- Package installs into a fresh AdonisJS v7 app.
- Basic notification flow works in the fresh app.

## Suggested Milestones

### Milestone 1: Core Local Delivery

Scope:

- Package identity cleanup.
- Contracts.
- Config.
- Provider.
- Manager.
- `log` and `null` channels.
- Basic fake.

Exit criteria:

- Can send a notification to a fake recipient through `log` and `null`.
- Can test notification sending without external services.

### Milestone 2: Mail and Database Notifications

Scope:

- `MailMessage`.
- `MailChannel`.
- `DatabaseChannel`.
- Models and migrations.
- Read/seen repository.
- Notifiable mixin.

Exit criteria:

- Can send mail notifications.
- Can store and read database notifications.
- Can call `user.notify`.

### Milestone 3: Queue and Delivery Tracking

Scope:

- Queue integration.
- Delivery attempts.
- Retry command.
- Prune command.

Exit criteria:

- Queued notification jobs work.
- Delivery attempts are persisted and retryable.

### Milestone 4: Stable Developer Experience

Scope:

- Configure hook.
- Commands.
- Full docs.
- Hardening.
- Release preparation.

Exit criteria:

- Fresh app install path is documented and tested.
- Public API is ready for a `1.0.0` contract.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Optional integrations create hard runtime dependencies | Apps without mail/queue/lucid break | Use peer dependency metadata, lazy imports, and clear errors. |
| Queue serialization of arbitrary notification classes is brittle | Queued notifications fail in production | Require explicit serializable constructor data or serializer hooks. |
| Database schema is too opinionated | Apps cannot adapt table names or IDs | Make table names and id strategy configurable. |
| Public API stabilizes too early | Breaking changes become painful | Keep pre-1.0 milestones explicit and document unstable APIs. |
| Fakes diverge from real manager behavior | Tests pass while production fails | Fake should reuse normalization/channel selection where practical. |
| Channel adapters leak secrets in errors/logs | Privacy/security issue | Centralize redaction and test it. |

## Implementation Order Checklist

- [ ] Rename and clean package metadata.
- [ ] Define contracts and exceptions.
- [ ] Implement config helpers and stubs.
- [ ] Implement provider and service entrypoint.
- [ ] Implement manager, route notifications, and channel registry.
- [ ] Implement `null` and `log` channels.
- [ ] Implement testing fake.
- [ ] Implement mail channel.
- [ ] Implement database channel and migrations.
- [ ] Implement Notifiable mixin.
- [ ] Implement queue integration.
- [ ] Implement delivery attempts.
- [ ] Implement preferences and quiet hours.
- [ ] Implement Ace commands.
- [ ] Implement configure hook.
- [ ] Rewrite docs.
- [ ] Harden tests and packaging.
- [ ] Prepare release.

