import { Component, model } from "@angular/core";

@Component({
    selector: 'pip-color-picker',
    template: `
    <input
        type="color"
        aria-label="Escolher cor"
        class="w-10 h-10 p-0 bg-transparent border border-white cursor-pointer hover:outline-2 hover:outline-offset-2 hover:outline-white"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
    />
    `,
})
export class ColorPickerComponent {
    readonly value = model('#ffffff');
}
