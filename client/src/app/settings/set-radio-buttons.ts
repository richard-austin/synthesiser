import {ElementRef} from '@angular/core';

export class SetRadioButtons {
  public static set(formElRef: ElementRef<HTMLFormElement>, setting: any) {
    const form = formElRef.nativeElement;
    for (let elementsKey in form.elements) {
      // @ts-ignore
      if (form[elementsKey].value === setting) {
        // @ts-ignore
        form[elementsKey].checked = true;
        const event = new Event('change');
        form[elementsKey].dispatchEvent(event);  // Trigger change event to update the actual value
        break;
      }
    }
  }
}
