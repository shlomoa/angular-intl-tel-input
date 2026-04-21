import intlTelInput from "../intl-tel-input/intl-tel-input";
import validation from "../generated/validation.generated";
import IntlTelInput from "./IntlTelInput";
import {
  Component,
  forwardRef,
  input,
  output,
} from "@angular/core";
import {
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";

intlTelInput.validation = validation as typeof intlTelInput.validation;

export { intlTelInput };

@Component({
  selector: "intl-tel-input-with-validation",
  standalone: true,
  template: `
    <input
      type="tel"
      #inputRef
      (input)="handleInput()"
      (blur)="handleBlur($event)"
      (focus)="handleFocus($event)"
      (keydown)="handleKeyDown($event)"
      (keyup)="handleKeyUp($event)"
      (paste)="handlePaste($event)"
      (click)="handleClick($event)"
    />
  `,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => IntlTelInputWithValidation),
      multi: true,
    },
  ],
})
class IntlTelInputWithValidation extends IntlTelInput implements Validator {
  readonly usePreciseValidation = input(false);
  readonly validityChange = output<boolean>();
  readonly errorCodeChange = output<number | null>();

  private lastEmittedValidity?: boolean;
  private lastEmittedErrorCode?: number | null;
  // eslint-disable-next-line class-methods-use-this
  private onValidatorChange: () => void = () => {};

  override handleInput() {
    super.handleInput();

    const iti = this.getInstance();
    if (!iti) {
      return;
    }

    const isValid =
      (this.usePreciseValidation()
        ? iti.isValidNumberPrecise()
        : iti.isValidNumber()) ?? false;

    const errorCode = isValid ? null : iti.getValidationError();

    let hasChanged = false;
    if (isValid !== this.lastEmittedValidity) {
      this.lastEmittedValidity = isValid;
      this.validityChange.emit(isValid);
      hasChanged = true;
    }

    if (errorCode !== this.lastEmittedErrorCode) {
      this.lastEmittedErrorCode = errorCode;
      this.errorCodeChange.emit(errorCode);
      hasChanged = true;
    }

    if (hasChanged) {
      this.onValidatorChange();
    }
  }

  validate(_control: AbstractControl): ValidationErrors | null {
    const iti = this.getInstance();
    if (!iti || !iti.getNumber()) {
      return null;
    }

    const isValid = this.usePreciseValidation()
      ? iti.isValidNumberPrecise()
      : iti.isValidNumber();

    if (isValid) {
      return null;
    }

    const errorCode = iti.getValidationError();
    return {
      invalidPhone: errorCode,
    };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
export default IntlTelInputWithValidation;
