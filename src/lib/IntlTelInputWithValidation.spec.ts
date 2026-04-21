import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component, ViewChild, signal } from "@angular/core";
import { AbstractControl } from "@angular/forms";
import IntlTelInputWithValidation, {
  intlTelInput,
} from "./IntlTelInputWithValidation";

@Component({
  standalone: true,
  imports: [IntlTelInputWithValidation],
  template: `<intl-tel-input-with-validation
    #iti
    [initialCountry]="'us'"
    [usePreciseValidation]="usePreciseValidation()"
    (validityChange)="validityChanges.push($event)"
    (errorCodeChange)="errorCodeChanges.push($event)"
  />`,
})
class TestHostComponent {
  @ViewChild("iti") iti!: IntlTelInputWithValidation;
  usePreciseValidation = signal(false);
  validityChanges: boolean[] = [];
  errorCodeChanges: Array<number | null> = [];
}

describe("IntlTelInputWithValidation", () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  const tooShortError = intlTelInput.validation!.validationError.TOO_SHORT;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await host.iti.getInstance()?.promise;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it("should emit validation outputs and notify validator changes when invalidity changes", () => {
    const iti = host.iti.getInstance()!;
    const validatorChange = vi.fn();
    host.iti.registerOnValidatorChange(validatorChange);

    vi.spyOn(iti, "isValidNumber").mockReturnValue(false);
    vi.spyOn(iti, "getValidationError").mockReturnValue(tooShortError);

    const input = host.iti.getInput();
    input.value = "+1202";
    input.dispatchEvent(new Event("input"));

    expect(host.validityChanges).toEqual([false]);
    expect(host.errorCodeChanges).toEqual([tooShortError]);
    expect(validatorChange).toHaveBeenCalledTimes(1);

    input.dispatchEvent(new Event("input"));

    expect(host.validityChanges).toEqual([false]);
    expect(host.errorCodeChanges).toEqual([tooShortError]);
    expect(validatorChange).toHaveBeenCalledTimes(1);
  });

  it("should use precise validation when enabled", () => {
    host.usePreciseValidation.set(true);
    fixture.detectChanges();

    const iti = host.iti.getInstance()!;
    const looseSpy = vi.spyOn(iti, "isValidNumber");
    const preciseSpy = vi.spyOn(iti, "isValidNumberPrecise").mockReturnValue(true);
    const errorSpy = vi.spyOn(iti, "getValidationError");

    const input = host.iti.getInput();
    input.value = "+19999999999";
    input.dispatchEvent(new Event("input"));

    expect(preciseSpy).toHaveBeenCalled();
    expect(looseSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(host.validityChanges).toEqual([true]);
    expect(host.errorCodeChanges).toEqual([null]);
  });

  it("should return validation errors from validate()", () => {
    const iti = host.iti.getInstance()!;

    expect(host.iti.validate({} as AbstractControl)).toBeNull();

    const getNumberSpy = vi.spyOn(iti, "getNumber");
    const looseSpy = vi.spyOn(iti, "isValidNumber");
    const preciseSpy = vi.spyOn(iti, "isValidNumberPrecise");
    const errorSpy = vi.spyOn(iti, "getValidationError");

    getNumberSpy.mockReturnValue("+1202");
    looseSpy.mockReturnValue(false);
    errorSpy.mockReturnValue(tooShortError);

    expect(host.iti.validate({} as AbstractControl)).toEqual({
      invalidPhone: tooShortError,
    });
    expect(looseSpy).toHaveBeenCalled();

    host.usePreciseValidation.set(true);
    fixture.detectChanges();

    getNumberSpy.mockReturnValue("+12025550123");
    preciseSpy.mockReturnValue(true);

    expect(host.iti.validate({} as AbstractControl)).toBeNull();
    expect(preciseSpy).toHaveBeenCalled();
  });
});
