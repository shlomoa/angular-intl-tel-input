cmake_minimum_required(VERSION 3.20)
project(angular-intl-tel-input NONE)

# Paths
set(SRC_DIR ${CMAKE_SOURCE_DIR}/src)
set(GENERATED_DIR ${SRC_DIR}/generated)
set(SCRIPTS_DIR ${CMAKE_SOURCE_DIR}/scripts)
set(REPO_ROOT ${CMAKE_SOURCE_DIR})
set(LIBPHONENUMBER_DIR ${REPO_ROOT}/third_party/libphonenumber)
set(LIBPHONENUMBER_MARKER ${LIBPHONENUMBER_DIR}/javascript/i18n/phonenumbers/phonenumberutil.js)

# --- Install ---
add_custom_command(
  OUTPUT ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml
  COMMAND pnpm install
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  DEPENDS ${CMAKE_SOURCE_DIR}/package.json
  COMMENT "Installing dependencies"
)
add_custom_target(install_deps DEPENDS ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml)

# --- Ensure libphonenumber sources ---
add_custom_command(
  OUTPUT ${LIBPHONENUMBER_MARKER}
  COMMAND node ${SCRIPTS_DIR}/ensure-libphonenumber.js ${REPO_ROOT}
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  DEPENDS
    ${SCRIPTS_DIR}/ensure-libphonenumber.js
    ${CMAKE_SOURCE_DIR}/.gitmodules
  COMMENT "Ensuring libphonenumber sources"
)
add_custom_target(submodules DEPENDS ${LIBPHONENUMBER_MARKER})

# --- Generate sprites (_metadata.scss + flag images) ---
set(METADATA_SCSS ${GENERATED_DIR}/_metadata.scss)
set(FLAGS_WEBP ${GENERATED_DIR}/flags.webp)

add_custom_command(
  OUTPUT ${METADATA_SCSS} ${FLAGS_WEBP}
  COMMAND node --experimental-strip-types ${SCRIPTS_DIR}/generate-sprite.js
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  DEPENDS
    ${SCRIPTS_DIR}/generate-sprite.js
    ${SRC_DIR}/intl-tel-input/data.ts
    ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml
  COMMENT "Generating flag sprites and _metadata.scss"
)
add_custom_target(generate_sprites DEPENDS ${METADATA_SCSS} ${FLAGS_WEBP})

# --- Generate validation (compiled libphonenumber) ---
set(VALIDATION_TS ${GENERATED_DIR}/validation.generated.ts)

add_custom_command(
  OUTPUT ${VALIDATION_TS}
  COMMAND node ${SCRIPTS_DIR}/build-validation.js
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  DEPENDS
    ${SCRIPTS_DIR}/build-validation.js
    ${SRC_DIR}/intl-tel-input/validation.js
    ${LIBPHONENUMBER_MARKER}
    ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml
  COMMENT "Compiling validation.generated.ts from libphonenumber"
)
add_custom_target(generate_validation DEPENDS ${VALIDATION_TS})

# --- Build (ng build) ---
set(BUILD_MARKER ${CMAKE_SOURCE_DIR}/dist/.build-stamp)

add_custom_command(
  OUTPUT ${BUILD_MARKER}
  COMMAND pnpm ng build
  COMMAND ${CMAKE_COMMAND} -E touch ${BUILD_MARKER}
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  DEPENDS
    ${METADATA_SCSS}
    ${FLAGS_WEBP}
    ${VALIDATION_TS}
    ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml
  COMMENT "Building Angular library"
)
add_custom_target(build ALL DEPENDS ${BUILD_MARKER})

# --- Clean ---
add_custom_target(clean_all
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/dist
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${GENERATED_DIR}
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/.angular
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/out-tsc
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  COMMENT "Cleaning generated files and local build artifacts"
)

# --- Dist clean (restore to git checkout state) ---
add_custom_target(dist_clean
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/dist
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${GENERATED_DIR}
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/.angular
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/out-tsc
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_SOURCE_DIR}/node_modules
  COMMAND ${CMAKE_COMMAND} -E rm -rf ${CMAKE_BINARY_DIR}
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  COMMENT "Restoring package to git checkout state"
)
{
  "name": "angular-intl-tel-input",
  "version": "27.0.10",
  "description": "Standalone Angular component from intl-tel-input",
  "license": "MIT",
  "author": "Originally: Jack O'Connor (http://jackocnr.com)",
  "repository": {
    "type": "git",
    "url": "https://github.com/shlomoa/angular-intl-tel-input.git",
    "directory": "packages/angular"
  },
  "bugs": {
    "url": "https://github.com/shlomoa/angular-intl-tel-input/issues"
  },
  "homepage": "https://intl-tel-input.com",
  "keywords": [
    "angular",
    "phone",
    "telephone",
    "intl-tel-input",
    "international",
    "input",
    "component"
  ],
  "scripts": {
    "ng": "ng",
    "build": "cmake --build build",
    "clean": "cmake -S . -B build && cmake --build build --target clean_all",
    "dist_clean": "cmake -S . -B build && cmake --build build --target dist_clean",
    "build:watch": "ng build --watch --configuration development",
    "test": "ng test",
    "test:integration": "node scripts/validate-integration.cjs"
  },
  "packageManager": "pnpm@10.33.0",
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "sharp",
      "esbuild",
      "@parcel/watcher",
      "lmdb",
      "msgpackr-extract"
    ]
  },
  "devDependencies": {
    "@angular/build": "^21.2.7",
    "@angular/cli": "^21.2.7",
    "@angular/common": "^21.2.0",
    "@angular/compiler": "^21.2.0",
    "@angular/compiler-cli": "^21.2.0",
    "@angular/core": "^21.2.0",
    "@angular/forms": "^21.2.0",
    "@angular/platform-browser": "^21.2.0",
    "flag-icons": "^7.0.0",
    "google-closure-compiler": "^20260405.0.0",
    "google-closure-library": "^20230802.0.0",
    "jsdom": "^28.0.0",
    "ng-packagr": "^21.2.0",
    "rxjs": "~7.8.0",
    "sass": "^1.83.1",
    "sharp": "^0.33.0",
    "typescript": "~5.9.2",
    "vitest": "^4.0.8"
  },
  "sideEffects": false
}
