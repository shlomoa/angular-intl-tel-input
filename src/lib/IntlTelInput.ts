import intlTelInput, { Iti } from "../intl-tel-input/intl-tel-input";
import type { AllOptions, SomeOptions } from "../intl-tel-input/intl-tel-input";
import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";

export { intlTelInput };

const warnInputAttr = (prop: string): void => {
  console.warn(
    `intl-tel-input: ignoring inputAttributes.${prop} - see docs for more info.`,
  );
};

@Component({
  selector: "intl-tel-input",
  standalone: true,
  template: `
    <input
      type="tel"
      #inputRef
      (input)="onInput()"
      (blur)="handleBlur($event)"
      (focus)="handleFocus($event)"
      (keydown)="handleKeyDown($event)"
      (keyup)="handleKeyUp($event)"
      (paste)="handlePaste($event)"
      (click)="handleClick($event)"
    />
  `,
})
class IntlTelInput implements AfterViewInit, OnDestroy, FormValueControl<string> {
  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>("inputRef");

  /** initialValue is only used during initialization — changes after init are ignored. */
  readonly initialValue = input<string | undefined>(undefined);

  /** Signal Forms model binding for the current phone input value. */
  readonly value = model("");
  /** Signal Forms touched binding, updated on blur. */
  readonly touched = model(false);

  readonly inputAttributes = input<Record<string, string>>({});
  readonly disabled = input(false);
  readonly readonly = input(false);

  // Plugin initialisation options (one input per option)
  readonly allowDropdown = input<AllOptions["allowDropdown"] | undefined>(undefined);
  readonly allowedNumberTypes = input<AllOptions["allowedNumberTypes"] | undefined>(undefined);
  readonly allowNumberExtensions = input<AllOptions["allowNumberExtensions"] | undefined>(
    undefined,
  );
  readonly allowPhonewords = input<AllOptions["allowPhonewords"] | undefined>(undefined);
  readonly autoPlaceholder = input<AllOptions["autoPlaceholder"] | undefined>(undefined);
  readonly containerClass = input<AllOptions["containerClass"] | undefined>(undefined);
  readonly countryNameLocale = input<AllOptions["countryNameLocale"] | undefined>(undefined);
  readonly countryOrder = input<AllOptions["countryOrder"] | undefined>(undefined);
  readonly countrySearch = input<AllOptions["countrySearch"] | undefined>(undefined);
  readonly customPlaceholder = input<AllOptions["customPlaceholder"] | undefined>(undefined);
  readonly dropdownAlwaysOpen = input<AllOptions["dropdownAlwaysOpen"] | undefined>(undefined);
  readonly dropdownContainer = input<AllOptions["dropdownContainer"] | undefined>(undefined);
  readonly excludeCountries = input<AllOptions["excludeCountries"] | undefined>(undefined);
  readonly fixDropdownWidth = input<AllOptions["fixDropdownWidth"] | undefined>(undefined);
  readonly formatAsYouType = input<AllOptions["formatAsYouType"] | undefined>(undefined);
  readonly formatOnDisplay = input<AllOptions["formatOnDisplay"] | undefined>(undefined);
  readonly geoIpLookup = input<AllOptions["geoIpLookup"] | undefined>(undefined);
  readonly hiddenInput = input<AllOptions["hiddenInput"] | undefined>(undefined);
  readonly i18n = input<AllOptions["i18n"] | undefined>(undefined);
  readonly initialCountry = input<AllOptions["initialCountry"] | undefined>(undefined);
  readonly loadUtils = input<AllOptions["loadUtils"] | undefined>(undefined);
  readonly nationalMode = input<AllOptions["nationalMode"] | undefined>(undefined);
  readonly onlyCountries = input<AllOptions["onlyCountries"] | undefined>(undefined);
  readonly placeholderNumberType = input<AllOptions["placeholderNumberType"] | undefined>(
    undefined,
  );
  readonly searchInputClass = input<AllOptions["searchInputClass"] | undefined>(undefined);
  readonly separateDialCode = input<AllOptions["separateDialCode"] | undefined>(undefined);
  readonly showFlags = input<AllOptions["showFlags"] | undefined>(undefined);
  readonly strictMode = input<AllOptions["strictMode"] | undefined>(undefined);
  readonly useFullscreenPopup = input<AllOptions["useFullscreenPopup"] | undefined>(undefined);

  readonly numberChange = output<string>();
  readonly countryChange = output<string>();
  readonly blur = output<FocusEvent>();
  readonly focusEvent = output<FocusEvent>({ alias: "focus" });
  readonly focus = this.focusEvent;
  readonly keydown = output<KeyboardEvent>();
  readonly keyup = output<KeyboardEvent>();
  readonly paste = output<ClipboardEvent>();
  readonly click = output<MouseEvent>();

  private iti?: Iti;
  // Effects are created after view init, so keep the component injector to scope cleanup correctly.
  private readonly injector = inject(Injector);
  private appliedInputAttrKeys = new Set<string>();
  private lastEmittedNumber?: string;
  private lastEmittedCountry?: string;
  private pendingModelSyncId = 0;
  private isApplyingModelValue = false;
  private countryChangeHandler = () => this.handleInput();

  ngAfterViewInit() {
    const inputElement = this.inputRef().nativeElement;
    this.iti = intlTelInput(inputElement, this.buildInitOptions());

    inputElement.addEventListener("countrychange", this.countryChangeHandler);

    effect(() => {
      this.iti?.setDisabled(this.disabled());
    }, { injector: this.injector });

    effect(() => {
      this.iti?.setReadonly(this.readonly());
    }, { injector: this.injector });

    effect(() => {
      this.applyInputAttrs(this.inputAttributes());
    }, { injector: this.injector });

    effect(() => {
      void this.syncValueToWidget(this.value());
    }, { injector: this.injector });

    const initialValue = this.initialValue();
    if (initialValue && !this.value()) {
      this.value.set(initialValue);
    }
  }

  private buildInitOptions(): SomeOptions {
    const options: Partial<AllOptions> = {
      allowDropdown: this.allowDropdown(),
      allowedNumberTypes: this.allowedNumberTypes(),
      allowNumberExtensions: this.allowNumberExtensions(),
      allowPhonewords: this.allowPhonewords(),
      autoPlaceholder: this.autoPlaceholder(),
      containerClass: this.containerClass(),
      countryNameLocale: this.countryNameLocale(),
      countryOrder: this.countryOrder(),
      countrySearch: this.countrySearch(),
      customPlaceholder: this.customPlaceholder(),
      dropdownAlwaysOpen: this.dropdownAlwaysOpen(),
      dropdownContainer: this.dropdownContainer(),
      excludeCountries: this.excludeCountries(),
      fixDropdownWidth: this.fixDropdownWidth(),
      formatAsYouType: this.formatAsYouType(),
      formatOnDisplay: this.formatOnDisplay(),
      geoIpLookup: this.geoIpLookup(),
      hiddenInput: this.hiddenInput(),
      i18n: this.i18n(),
      initialCountry: this.initialCountry(),
      loadUtils: this.loadUtils(),
      nationalMode: this.nationalMode(),
      onlyCountries: this.onlyCountries(),
      placeholderNumberType: this.placeholderNumberType(),
      searchInputClass: this.searchInputClass(),
      separateDialCode: this.separateDialCode(),
      showFlags: this.showFlags(),
      strictMode: this.strictMode(),
      useFullscreenPopup: this.useFullscreenPopup(),
    };

    return Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined),
    ) as SomeOptions;
  }

  protected shouldProcessInputEvent(): boolean {
    return Boolean(this.iti) && !this.isApplyingModelValue;
  }

  onInput(): void {
    this.handleInput();
  }

  handleInput(): boolean {
    // Avoid echoing programmatic model writes back into the model/output pipeline.
    if (!this.shouldProcessInputEvent()) {
      return false;
    }

    const iti = this.iti!;
    const inputVal = this.inputRef().nativeElement.value;
    const countryIso = iti.getSelectedCountryData()?.iso2 ?? "";

    if (inputVal !== this.lastEmittedNumber) {
      this.lastEmittedNumber = inputVal;
      this.value.set(inputVal);
      this.numberChange.emit(inputVal);
    }

    if (countryIso !== this.lastEmittedCountry) {
      this.lastEmittedCountry = countryIso;
      this.countryChange.emit(countryIso);
    }

    return true;
  }

  handleBlur(event: FocusEvent) {
    this.touched.set(true);
    this.blur.emit(event);
  }

  handleFocus(event: FocusEvent) {
    this.focusEvent.emit(event);
  }

  handleKeyDown(event: KeyboardEvent) {
    this.keydown.emit(event);
  }

  handleKeyUp(event: KeyboardEvent) {
    this.keyup.emit(event);
  }

  handlePaste(event: ClipboardEvent) {
    this.paste.emit(event);
  }

  handleClick(event: MouseEvent) {
    this.click.emit(event);
  }

  /**
   * This method must be called in `ngAfterViewInit` or later lifecycle hooks,
   * not in `ngOnInit` or the `constructor`, as the component needs to be fully initialized.
   */
  getInstance(): Iti | undefined {
    return this.iti;
  }

  /**
   * This method must be called in `ngAfterViewInit` or later lifecycle hooks,
   * not in `ngOnInit` or the `constructor`, as the component needs to be fully initialized.
   */
  getInput(): HTMLInputElement {
    return this.inputRef().nativeElement;
  }

  ngOnDestroy() {
    this.iti?.destroy();

    this.inputRef().nativeElement.removeEventListener("countrychange", this.countryChangeHandler);
  }

  private ignoredInputAttrs = new Set([
    "type",
    "value",
    "disabled",
    "readonly",
  ]);

  private applyInputAttrs(inputAttributes: Record<string, string>): void {
    const currentKeys = new Set<string>();
    Object.entries(inputAttributes).forEach(([key, value]) => {
      if (this.ignoredInputAttrs.has(key)) {
        warnInputAttr(key);
      } else {
        currentKeys.add(key);
        this.inputRef().nativeElement.setAttribute(key, value);
      }
    });
    this.appliedInputAttrKeys.forEach((key) => {
      if (!currentKeys.has(key)) {
        this.inputRef().nativeElement.removeAttribute(key);
      }
    });
    this.appliedInputAttrKeys = currentKeys;
  }

  private async syncValueToWidget(value: string): Promise<void> {
    const iti = this.iti;
    if (!iti) {
      return;
    }

    const syncId = ++this.pendingModelSyncId;
    await iti.promise;

    if (!this.iti?.isActive() || syncId !== this.pendingModelSyncId) {
      return;
    }

    const inputElement = this.inputRef().nativeElement;
    if (inputElement.value === value) {
      return;
    }

    this.isApplyingModelValue = true;
    try {
      iti.setNumber(value);
    } finally {
      this.isApplyingModelValue = false;
    }
  }
}
export default IntlTelInput;
