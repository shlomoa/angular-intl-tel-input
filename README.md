# angular-intl-tel-input

Standalone Angular component for international telephone input, built from [intl-tel-input](https://github.com/jackocnr/intl-tel-input).

## Prerequisites

- Node.js >= 22.6
- pnpm 10+
- CMake >= 3.20
- Git (for submodule init)

## Install stage

```sh
pnpm install
```

The package allows native build scripts for `sharp`, `esbuild`, and related dependencies via the `pnpm.onlyBuiltDependencies` setting in `package.json`.

## Build stages

### 1. Configure the build

```sh
cmake -S . -B build
```

### 2. Full package build

CMake orchestrates the full build pipeline: dependency install, code generation (flag sprites + libphonenumber validation), and `ng build`.

```sh
cmake --build build
```

### 3. Manual build stages

If you want to run the stages individually, use:

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

## Unit tests

```sh
pnpm test
```

## Validation stages

### 2.1 Install validation

Validate that dependency installation succeeds:

```sh
pnpm install
```

### 2.2 Build validation

Validate the standalone package build assumptions:

- inputs are consumed only from `packages/angular` and `third_party`
- generated output stays within `packages/angular`
- the package does not depend on the external `intl-tel-input` npm package

The build command for this stage is:

```sh
cmake --build build
```

### 2.3 Full standalone validation

Validate the package in isolation by copying only:

- `packages/angular`
- `third_party`

Then run the same install/build flow from the copied `packages/angular` directory.

Minimum standalone sequence:

```sh
pnpm install
node --experimental-strip-types scripts/generate-sprite.js
node scripts/build-validation.js
pnpm ng build
```

### 2.4 Integration validation

Validate that a consumer Angular app can install and build against the generated package:

```sh
pnpm run test:integration
```

This script:

- requires a built package in `dist/`
- creates a temporary Angular application
- installs `angular-intl-tel-input` from the local `dist/`
- builds the consumer app with `import { IntlTelInput } from 'angular-intl-tel-input'`

On success the temp app directory is printed. To serve it interactively:

```sh
cd <printed temp path>
pnpm ng serve
```

## Consumer usage

Import the component as a named export:

```ts
import { IntlTelInput } from 'angular-intl-tel-input';
```

Import the package stylesheet as well:

```css
@import "angular-intl-tel-input/styles";
```

`IntlTelInputWithValidation` is also exported as a named export.

## Package output

The built package in `dist/` is ready for `npm publish` as `angular-intl-tel-input`.
