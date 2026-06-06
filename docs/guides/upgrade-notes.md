# Upgrade Notes

## Versioning Policy

This package is currently pre-1.0 (`0.x.x`). During this period:

- **Minor versions** (`0.2.0`, `0.3.0`, etc.) may include breaking changes
- **Patch versions** (`0.1.1`, `0.1.2`, etc.) are backwards-compatible fixes only
- We follow a pragmatic approach: breaking changes are documented and announced

## Tracking Changes

- [Changelog](https://github.com/your-org/adonisjs-notifications/blob/main/CHANGELOG.md)
- [GitHub Releases](https://github.com/your-org/adonisjs-notifications/releases)

## Known Breaking Changes

No breaking changes have been released yet. This section will be updated as the API evolves.

## Migration Steps

When upgrading between minor versions:

1. Read the release notes for the target version
2. Check for any renamed methods, moved exports, or changed config shapes
3. Update your notification classes and config accordingly
4. Run your test suite to catch any regressions

## Stable vs Experimental Features

|Feature|Status|Notes|
|---|---|---|
|Mail channel|Stable|Production-ready|
|Database channel|Stable|Production-ready|
|Log channel|Stable|Production-ready|
|Null channel|Stable|Production-ready|
|Queue delivery|Stable|Requires @adonisjs/queue|
|Test fakes|Stable|Production-ready|
|Custom channels|Stable|Interface may evolve slightly|
|Delivery tracking|Stable|Requires Lucid + migrations|
|Preference filtering|Experimental|API may change|
|Quiet hours|Experimental|API may change|
|Retry logic|Stable|backoff array format|

## Peer Dependency Compatibility

|Package Version|Minimum|Maximum|
|---|---|---|
|@adonisjs/core|7.0.0|—|
|@adonisjs/lucid|22.0.0|—|
|@adonisjs/mail|4.0.0|—|
|@adonisjs/queue|1.0.0|—|

## Future Plans (Post-1.0)

- 1.0 will declare API stability
- After 1.0, breaking changes will only occur in major versions
- SemVer will be strictly followed from 1.0 onwards
