# Installation

## Quick install

```bash
npm i @rikology/adonisjs-notifications
node ace configure @rikology/adonisjs-notifications
```

The configure command will:
1. Detect optional peer dependencies (@adonisjs/lucid, @adonisjs/mail, @adonisjs/queue)
2. Prompt to install missing ones
3. Publish config/stubs/config/notifications.stub to config/notifications.ts
4. Optionally publish migrations (if lucid is installed)
5. Register the provider and commands in adonisrc.ts

## Manual setup

Add to adonisrc.ts:
```ts
export default defineConfig({
  providers: [
    () => import('@rikology/adonisjs-notifications/notification_provider'),
  ],
  commands: [
    () => import('@rikology/adonisjs-notifications/commands'),
  ],
})
```

Copy the config stub manually from stubs/config/notifications.stub.

## Requirements

- Node.js >= 24.0.0
- @adonisjs/core >= 7.0.0

## Optional peer dependencies

|Package|Needed for|Install|
|---|---|---|
|@adonisjs/lucid|Database channel, inbox, delivery tracking|`npm i @adonisjs/lucid`|
|@adonisjs/mail|Mail channel|`npm i @adonisjs/mail`|
|@adonisjs/queue|Queued delivery|`npm i @adonisjs/queue`|

These are all optional. The package works with just the `log` and `null` channels out of the box.
