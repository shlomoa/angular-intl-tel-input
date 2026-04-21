# Requirements for the new Angular implementation

## Purpose

Define the minimum product and API requirements for a new, modern Angular telephone input package to be published as `@angular-intl-tel-input`, based on the current `intl-tel-input` documentation.

## Source documents

- General docs
  - `intl-tel-input` getting started: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/site/src/docs/markdown/getting_started.md>
  - `intl-tel-input` options: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/site/src/docs/markdown/options.md>
  - `intl-tel-input` methods: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/site/src/docs/markdown/methods.md>
  - `intl-tel-input` utils: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/site/src/docs/markdown/utils.md>
  - `intl-tel-input` theming: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/site/src/docs/markdown/theming.md>
  - `intl-tel-input` README / attributions: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/README.md>
- Angular-specific docs
  - Angular component docs: <https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/site/src/docs/markdown/angular_component.md>
- Origin references called out by the issue
  - `flag-icons`: <https://raw.githubusercontent.com/lipis/flag-icons/main/README.md>
  - Google's `libphonenumber` JavaScript README: <https://raw.githubusercontent.com/google/libphonenumber/master/javascript/README.md>

## Definitions

- **E.164 number**: the canonical full international number format to store and emit, for example `+17024181234`.
- **Utils script**: the optional validation/formatting module used by `intl-tel-input`; upstream documents it as a custom build of Google's `libphonenumber`.
- **Precise validation**: country/area-rule validation using `isValidNumberPrecise`; upstream marks this as advanced and more maintenance-sensitive.
- **Flag assets**: country flag imagery derived from the `flag-icons` project.

## General requirements from `intl-tel-input`

### Validation requirements

- The package must support validation through a utils layer derived from Google's `libphonenumber`.
- The package must support the same validation-related capabilities described upstream:
  - `isValidNumber`
  - `isValidNumberPrecise`
  - `getValidationError`
  - `getNumberType`
  - `getNumber`
  - `setNumber`
- The package should prefer the upstream default validation model:
  - use `isValidNumber` as the default, because it is length-based and more future-proof
  - support an opt-in precise mode equivalent to `isValidNumberPrecise`
- The package must document and preserve the upstream warning that precise validation requires frequent metadata updates or valid numbers may be rejected over time.
- Validation-dependent behavior must not be used before the utils layer has finished loading.
- The package must support emitting or exposing validation error codes so applications can map them to their own user-facing messages.
- The package must support the upstream validation configuration concepts:
  - `allowedNumberTypes`
  - `allowNumberExtensions`
  - `allowPhonewords`
  - `strictMode`
- When strict input filtering is enabled, the package should preserve the upstream behavior expectation that non-phone characters are rejected and maximum valid length is enforced.

### Formatting and value requirements tied to validation

- The package should support loading validation/formatting utilities in a lightweight way:
  - bundled-with-utils import for convenience
  - lazy-loaded utils for smaller initial bundle size
- The package should follow the upstream recommendation to:
  - store values in E.164 format
  - initialise the component from an E.164 value when available
  - derive the displayed country from that value when possible
- The package should support formatting-on-display and formatting-as-you-type when the utils layer is available.
- The package should support placeholder generation from example numbers when the utils layer is available.

### Flag/icon origin requirements

- Country flag assets for the new Angular package must originate from `flag-icons`.
- Validation and formatting metadata/code must originate from Google's `libphonenumber`, matching the upstream `intl-tel-input` model.
- The package should keep the upstream country-to-ISO2 flag mapping model used by `intl-tel-input`.
- The package must support hiding flags and showing a generic globe state instead, matching upstream `showFlags=false` behavior.
- The package should preserve theming/scaling support for flag presentation, including a configurable flag width and derived height behavior.
- The package should avoid introducing a different flag asset source unless requirements are explicitly revised.

## Angular component requirements

### Package-level usage

- Consumers must be able to import the Angular component and the package stylesheet.
- The package should support two usage modes documented upstream:
  - an Angular import that includes utils for convenience
  - an Angular import without bundled utils, paired with a lazy `loadUtils` option

### Inputs / props

- The Angular component must support these documented component inputs:
  - `disabled`
  - `initialValue`
  - `inputAttributes`
  - `readonly`
  - `usePreciseValidation`
- All core plugin initialisation options must be exposed as individual Angular inputs using the same option names, instead of a single `initOptions` object.
- `inputAttributes` must allow normal HTML input attributes such as `class`, `placeholder`, and `required`.
- The Angular wrapper must reserve and ignore the keys documented upstream for component/plugin integration:
  - `type`
  - `value`
  - `disabled`
  - `readonly`

### Forms integration

- The Angular component must implement `ControlValueAccessor`.
- The component must support Angular forms integration via:
  - `[(ngModel)]`
  - `formControl`
  - `formControlName`
- When the bound Angular form value changes, the component must update the underlying telephone input via `setNumber`.
- The value emitted back to Angular forms should remain the normalized phone value expected by the component contract.

### Events

- The Angular component must support the documented Angular output events:
  - `countryChange`
  - `errorCodeChange`
  - `numberChange`
  - `validityChange`
- `countryChange` must emit the selected country ISO2 code, or `""` when no country is selected.
- `numberChange` must emit the normalized E.164 value, or `""` when the input is empty.
- `validityChange` must emit a boolean validity state.
- `errorCodeChange` must emit the current validation error code or `null` when valid.
- Validation-related outputs must depend on the utils layer being available.
- The component should expose the documented native events directly for Angular template binding:
  - `blur`
  - `focus`
  - `keydown`
  - `keyup`
  - `paste`
  - `click`

### Imperative access

- Consumers must be able to get the underlying plugin instance from a `ViewChild` reference.
- Consumers must be able to get the underlying input DOM element from the component.
- The component documentation and behavior must require instance access only after `ngAfterViewInit`.
- Static plugin APIs must be accessible by importing the lower-case `intlTelInput` symbol from the same Angular entry point as the component.

## Non-goals for this issue

- No implementation changes are defined here beyond creating this requirements document.
- No API redesign is decided here beyond capturing the current upstream behavioral contract.
