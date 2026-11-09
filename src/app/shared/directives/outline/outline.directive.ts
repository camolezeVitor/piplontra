import { Directive } from "@angular/core";

@Directive({
    selector: '[pipOutline]',
    host: { class: 'bg-black text-white border-1 border-white' }
})
export class OutlineDirective {}