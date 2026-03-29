<div align="center">

# Amelia

Build Midori browsers with ease

**This is still in a prerelease / prototype phase.**

</div>

## Installation

```sh
npm install @goastian/amelia
```

## Documentation

Documentation is available on [docs.gluon.dev](https://docs.gluon.dev) or in the docs folder of this repository.

## CI-safe packaging and addons

Special handling for packaging and addons is now integrated in source:

- Packaging now performs a Tor preflight check before `mach package`.
- Tor preflight is skipped for unsupported targets: `linux-aarch64` and `win32-aarch64`.
- `mach package` and `mach package-multi-locale` now abort explicitly if they fail.
- Addon initialization skips git commit when `AMELIA_SKIP_ADDON_GIT_INIT=1` or when `CI=true`.
- Addon mozbuild updates now use `browser/extensions/moz.build` when present, fall back to `browser/extensions/app.mozbuild`, and create a base file if needed.
- Branding patch fallback now uses `browser/branding/official` when `browser/branding/unofficial` does not exist.

### Usage

Normal local run:

```sh
npm run self
```

CI-safe run (skip addon git commit):

```sh
npm run self:ci-safe
```

Target-aware Tor preflight (set these in CI for accurate behavior):

```sh
AMELIA_PLATFORM=linux
AMELIA_COMPAT=aarch64
```

## Licencing notes

The following is included in good faith. The writer is not a lawyer, and this is not legal advice.

### Surfer, Gluon and Melon

Amelia is a fork of [Surfer](https://github.com/zen-browser/surfer) and Surfer is based on [Gluon](https://github.com/pulse-browser/gluon) but the author has stoped working on it. Gluon has been extracted from melon, the build tool for the [desktop version of Dot Browser](https://github.com/dothq/browser-desktop) under MPL v2.0.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

### Firefox

This program downloads and modifies Firefox. [Follow their license](https://hg.mozilla.org/mozilla-central/file/tip/LICENSE) when distributing your program.
