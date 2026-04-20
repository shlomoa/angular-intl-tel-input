# angular-intl-tel-input

Standalone Angular component for international telephone input, built from [intl-tel-input](https://github.com/jackocnr/intl-tel-input).

## Prerequisites

- Node.js >= 22.6
- pnpm 10+
- CMake >= 3.20
- Git (for submodule init)

## Install

```sh
pnpm install
```

## Build

CMake orchestrates the full build pipeline: dependency install, code generation (flag sprites + libphonenumber validation), and `ng build`.

```sh
cmake -S . -B build
cmake --build build
```

Or run individual steps manually:

```sh
# Generate flag sprites and _metadata.scss
node --experimental-strip-types scripts/generate-sprite.js

# Compile libphonenumber validation
node scripts/build-validation.js

# Build the Angular library
pnpm ng build
```

Generated files are written to `src/generated/` and excluded from version control.

The distributable Angular package is output to `dist/`.

## Package

The built package in `dist/` is ready for `npm publish` as `angular-intl-tel-input`.
