import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component, ViewChild, signal } from "@angular/core";
import { FormField, disabled } from "@angular/forms/signals";
import { SignalFormControl } from "@angular/forms/signals/compat";
import IntlTelInput from "./IntlTelInput";
import type { AllOptions } from "../intl-tel-input/intl-tel-input";

// Host component for testing
@Component({
  standalone: true,
  imports: [IntlTelInput, FormField],
  template: `<intl-tel-input
    #iti
    [initialCountry]="initialCountry"
    [inputAttributes]="inputAttributes()"
    [formField]="control.fieldTree"
    (blur)="blurCount = blurCount + 1"
    (focus)="focusCount = focusCount + 1"
  />`,
})
class TestHostComponent {
  @ViewChild("iti") iti!: IntlTelInput;
  isDisabled = signal(false);
  control = new SignalFormControl("", (path) => {
    disabled(path, () => this.isDisabled());
  });
  initialCountry: AllOptions["initialCountry"] = "us";
  inputAttributes = signal<Record<string, string>>({});
  blurCount = 0;
  focusCount = 0;
}

describe("IntlTelInput", () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    // wait for iti initialisation (afterViewInit + promise)
    await host.iti.getInstance()?.promise;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it("should create the component", () => {
    expect(host.iti).toBeTruthy();
  });

  it("should render a tel input element", () => {
    const input = host.iti.getInput();
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input.type).toBe("tel");
  });

  it("should expose an Iti instance", () => {
    const instance = host.iti.getInstance();
    expect(instance).toBeTruthy();
  });

  it("should set initialCountry", () => {
    const data = host.iti.getInstance()!.getSelectedCountryData()!;
    expect(data.iso2).toBe("us");
  });

  it("should apply disabled state", () => {
    host.iti.getInstance()!.setDisabled(true);
    expect(host.iti.getInput().disabled).toBe(true);

    host.iti.getInstance()!.setDisabled(false);
    expect(host.iti.getInput().disabled).toBe(false);
  });

  it("should apply readonly state", () => {
    host.iti.getInstance()!.setReadonly(true);
    expect(host.iti.getInput().readOnly).toBe(true);

    host.iti.getInstance()!.setReadonly(false);
    expect(host.iti.getInput().readOnly).toBe(false);
  });

  it("should apply and remove inputAttributes", async () => {
    const input = host.iti.getInput();

    // Apply attributes
    const attrs1 = { "aria-label": "Phone", maxlength: "20" };
    host.inputAttributes.set(attrs1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.getAttribute("aria-label")).toBe("Phone");
    expect(input.getAttribute("maxlength")).toBe("20");

    // Remove maxlength by omitting it
    const attrs2 = { "aria-label": "Phone" };
    host.inputAttributes.set(attrs2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.getAttribute("aria-label")).toBe("Phone");
    expect(input.getAttribute("maxlength")).toBeNull();
  });

  it("should ignore reserved inputAttributes", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reserved = { type: "text", value: "x", disabled: "true" };
    host.inputAttributes.set(reserved);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  it("should emit blur and focus events", () => {
    const input = host.iti.getInput();
    input.dispatchEvent(new FocusEvent("focus"));
    expect(host.focusCount).toBe(1);

    input.dispatchEvent(new FocusEvent("blur"));
    expect(host.blurCount).toBe(1);
  });

  describe("Signal Forms", () => {
    it("should write value via SignalFormControl", async () => {
      host.control.setValue("+12025551234");
      fixture.detectChanges();
      await fixture.whenStable();
      await host.iti.getInstance()?.promise;
      fixture.detectChanges();
      // the number should be set on the input
      const input = host.iti.getInput();
      expect(input.value).toContain("202");
    });

    it("should set disabled via SignalFormControl", async () => {
      host.isDisabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.iti.getInput().disabled).toBe(true);

      host.isDisabled.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.iti.getInput().disabled).toBe(false);
    });

    it("should mark the bound SignalFormControl as touched on blur", async () => {
      expect(host.control.touched).toBe(false);

      const input = host.iti.getInput();
      input.dispatchEvent(new FocusEvent("blur"));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.control.touched).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should destroy Iti on component destroy", () => {
      const instance = host.iti.getInstance()!;
      fixture.destroy();
      expect(instance.isActive()).toBe(false);
    });
  });
});
