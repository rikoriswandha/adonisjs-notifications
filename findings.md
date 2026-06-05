# Findings

## Framework Findings

- AdonisJS v7 packages should integrate through service providers, configure hooks, package exports, and `adonisrc.ts` provider/command registration.
- AdonisJS v7 requires Node.js 24+ in this repo's `package.json`.
- Service providers can bind or singleton services in the container and expose aliases through `ContainerBindings` augmentation.
- The configure flow should publish config, migrations, command registration, and optional stubs without overwriting existing app files unless forced.
- AdonisJS mail and queue packages are first-class integrations. The notification package should compose with them rather than implement mail transports or queue runners.
- Testing should use Japa and Adonis container swap/restore patterns for fakes.

## Repo Findings

- The repo is an AdonisJS package starter, not a git repository in this workspace.
- Current package metadata still uses starter-kit defaults: package name is `pkg-starter-kit`, README is starter content, and implementation files are placeholders.
- Existing important files:
  - `package.json`
  - `index.ts`
  - `configure.ts`
  - `stubs/main.ts`
  - `tests/example.spec.ts`
  - `providers/README.md`
  - `src/README.md`
- `index.ts` currently exports only `configure` and `stubsRoot`.
- `configure.ts` currently contains an empty configure hook.
- `package.json` exports only `.` and `./types`.

## Product Findings

- A strong notification library should provide Laravel-style ergonomics while staying TypeScript-first and Adonis-native.
- The core abstractions should be:
  - `Notification`
  - `NotificationManager`
  - `Notifiable`
  - channel drivers
  - route notifiables
  - delivery jobs
  - notification repository
  - testing fake
- Database notifications and delivery attempts should be separate records.
- Initial channels should be limited to core, low-risk channels: `mail`, `database`, `log`, and `null`.
- Later channels can include `sms`, `webhook`, `slack`, and `broadcast`.
