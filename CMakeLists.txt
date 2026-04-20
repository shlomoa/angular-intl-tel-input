cmake_minimum_required(VERSION 3.20)
project(angular-intl-tel-input NONE)

# Paths
set(SRC_DIR ${CMAKE_SOURCE_DIR}/src)
set(GENERATED_DIR ${SRC_DIR}/generated)
set(SCRIPTS_DIR ${CMAKE_SOURCE_DIR}/scripts)
set(REPO_ROOT ${CMAKE_SOURCE_DIR})

# --- Install ---
add_custom_command(
  OUTPUT ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml
  COMMAND pnpm install
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  DEPENDS ${CMAKE_SOURCE_DIR}/package.json
  COMMENT "Installing dependencies"
)
add_custom_target(install_deps DEPENDS ${CMAKE_SOURCE_DIR}/node_modules/.pnpm/lock.yaml)

# --- Git submodule (libphonenumber) ---
set(LIBPHONENUMBER_MARKER ${REPO_ROOT}/third_party/libphonenumber/javascript/i18n/phonenumbers/phonenumberutil.js)
add_custom_command(
  OUTPUT ${LIBPHONENUMBER_MARKER}
  COMMAND git submodule update --init --recursive
  WORKING_DIRECTORY ${REPO_ROOT}
  COMMENT "Initializing libphonenumber submodule"
)
add_custom_target(submodules DEPENDS ${LIBPHONENUMBER_MARKER})

# --- Generate sprites (_metadata.scss + flag images) ---
set(METADATA_SCSS ${GENERATED_DIR}/_metadata.scss)
set(FLAGS_WEBP ${GENERATED_DIR}/flags.webp)
file(GLOB DATA_SOURCES ${SRC_DIR}/intl-tel-input/data.ts)

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
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  COMMENT "Cleaning generated files and dist"
)
