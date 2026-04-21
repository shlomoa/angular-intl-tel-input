# angular-intl-tel-input

Standalone Angular component for international telephone input, built from [intl-tel-input](https://github.com/jackocnr/intl-tel-input).

## Prerequisites

- Node.js >= 22.6
- pnpm 10+
- CMake >= 3.20
- Git (for submodule init)

## Package commands

Run these commands from the package root. In a monorepo checkout, that directory is `packages/angular`.

| Command | Runs | Use it for |
| --- | --- | --- |
| `pnpm run ng -- <args>` | `ng` | Angular CLI commands. |
| `pnpm run build` | `cmake --build build` | Full CMake build after `cmake -S . -B build`. |
| `pnpm run clean` | `cmake -S . -B build && cmake --build build --target clean_all` | Remove local build outputs and generated files. |
| `pnpm run dist_clean` | `cmake -S . -B build && cmake --build build --target dist_clean && cmake -E rm -rf build` | Restore the package to a checkout-like state by removing build outputs, generated files, `node_modules/`, and `build/`. |
| `pnpm run build:watch` | `ng build --watch --configuration development` | Rebuild the Angular library in watch mode. |
| `pnpm run test` | `ng test` | Run unit tests. |
| `pnpm run test:integration` | `node scripts/validate-integration.cjs` | Validate that a consumer Angular app can install and build against the generated package. |

`pnpm test` also runs the `test` script.

## CMake commands

Configure the build directory before running CMake build targets:

```sh
cmake -S . -B build
```

| Command | Runs | Use it for |
| --- | --- | --- |
| `cmake --build build --target install_deps` | `pnpm install` | Install package dependencies. |
| `cmake --build build --target submodules` | `node scripts/ensure-libphonenumber.js <repo-root>` | Ensure the vendored libphonenumber sources are available. |
| `cmake --build build --target generate_sprites` | `node --experimental-strip-types scripts/generate-sprite.js` | Generate `src/generated/_metadata.scss` and `src/generated/flags.webp`. |
| `cmake --build build --target generate_validation` | `node scripts/build-validation.js` | Compile `src/generated/validation.generated.ts` from libphonenumber. |
| `cmake --build build` | `pnpm ng build`, `node scripts/postbuild-package.cjs`, and `cmake -E touch dist/.build-stamp` | Run the default `build` target, including dependency install, source generation, Angular build, package post-processing, and build stamp creation. |
| `cmake --build build --target build` | `pnpm ng build`, `node scripts/postbuild-package.cjs`, and `cmake -E touch dist/.build-stamp` | Run the explicit CMake `build` target. |
| `cmake --build build --target clean_all` | `cmake -E rm -rf` for `dist/`, `src/generated/`, `.angular/`, and `out-tsc/` | Remove generated files and local build artifacts. |
| `cmake --build build --target dist_clean` | `cmake -E rm -rf` for `dist/`, `src/generated/`, `.angular/`, `out-tsc/`, and `node_modules/` | Remove generated and dependency state while leaving the active CMake build directory in place. |

`pnpm run dist_clean` removes `build/` after the CMake target finishes. Removing the active build directory from inside the generated Visual Studio/MSBuild target is unreliable on Windows.

Generated files are written to `src/generated/` and excluded from version control. The distributable Angular package is output to `dist/`.

## Common flows

Install dependencies:

```sh
pnpm install
```

Build the package:

```sh
cmake -S . -B build
pnpm run build
```

Run the full build directly through CMake:

```sh
cmake -S . -B build
cmake --build build
```

Run individual generation stages:

```sh
cmake --build build --target generate_sprites
cmake --build build --target generate_validation
```

Run unit tests:

```sh
pnpm test
```

## Validation stages

### Install validation

Validate that dependency installation succeeds:

```sh
pnpm install
```

The package allows native build scripts for `sharp`, `esbuild`, and related dependencies via the `pnpm.onlyBuiltDependencies` setting in `package.json`.

### Build validation

Validate the standalone package build assumptions:

- inputs are consumed only from `packages/angular` and `third_party`
- generated output stays within `packages/angular`
- the package does not depend on the external `intl-tel-input` npm package

The build command for this stage is:

```sh
cmake --build build
```

### Full standalone validation

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

### Integration validation

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
