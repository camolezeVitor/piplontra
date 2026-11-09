import { Directive } from "@angular/core";

@Directive({
    selector: "[pipTitle]",
    host: { class: 'font-black !text-white' }
})
export class TitleDirective {}