import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component, ViewChild } from "@angular/core";
import {
  FormControl,
  ReactiveFormsModule,
  FormsModule,
} from "@angular/forms";
import IntlTelInput from "./IntlTelInput";
import type { AllOptions } from "../intl-tel-input/intl-tel-input";

// Host component for testing
@Component({
  standalone: true,
  imports: [IntlTelInput, ReactiveFormsModule, FormsModule],
  template: `<intl-tel-input
    #iti
    [initialCountry]="initialCountry"
    [inputAttributes]="inputAttributes"
    [formControl]="control"
    (blur)="blurCount = blurCount + 1"
    (focus)="focusCount = focusCount + 1"
  />`,
})
class TestHostComponent {
  @ViewChild("iti") iti!: IntlTelInput;
  control = new FormControl("");
  initialCountry: AllOptions["initialCountry"] = "us";
  inputAttributes: Record<string, string> = {};
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

  it("should apply and remove inputAttributes", () => {
    const input = host.iti.getInput();

    // Apply attributes
    const attrs1 = { "aria-label": "Phone", maxlength: "20" };
    host.iti.inputAttributes = attrs1;
    host.iti.ngOnChanges({
      inputAttributes: {
        previousValue: {},
        currentValue: attrs1,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(input.getAttribute("aria-label")).toBe("Phone");
    expect(input.getAttribute("maxlength")).toBe("20");

    // Remove maxlength by omitting it
    const attrs2 = { "aria-label": "Phone" };
    host.iti.inputAttributes = attrs2;
    host.iti.ngOnChanges({
      inputAttributes: {
        previousValue: attrs1,
        currentValue: attrs2,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(input.getAttribute("aria-label")).toBe("Phone");
    expect(input.getAttribute("maxlength")).toBeNull();
  });

  it("should ignore reserved inputAttributes", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reserved = { type: "text", value: "x", disabled: "true" };
    host.iti.inputAttributes = reserved;
    host.iti.ngOnChanges({
      inputAttributes: {
        previousValue: {},
        currentValue: reserved,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
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

  describe("ControlValueAccessor", () => {
    it("should write value via FormControl", async () => {
      host.control.setValue("+12025551234");
      await host.iti.getInstance()?.promise;
      fixture.detectChanges();
      // the number should be set on the input
      const input = host.iti.getInput();
      expect(input.value).toContain("202");
    });

    it("should set disabled via FormControl", () => {
      host.control.disable();
      fixture.detectChanges();
      expect(host.iti.getInput().disabled).toBe(true);

      host.control.enable();
      fixture.detectChanges();
      expect(host.iti.getInput().disabled).toBe(false);
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
