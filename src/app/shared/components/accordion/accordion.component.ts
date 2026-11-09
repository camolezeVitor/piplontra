import { Component, model } from "@angular/core";

/**
 * Seção que abre/fecha. Projete o título com `accordionTitle` e o conteúdo no
 * slot padrão:
 *
 *   <pip-accordion [(open)]="infosOpen">
 *     <p accordionTitle>INFOS</p>
 *     conteúdo
 *   </pip-accordion>
 */
@Component({
    selector: 'pip-accordion',
    template: `
    <button
        type="button"
        class="w-full flex flex-row items-center justify-between gap-2 cursor-pointer select-none"
        (click)="open.set(!open())"
    >
        <ng-content select="[accordionTitle]" />
        <span class="text-[10px] shrink-0 transition-transform duration-150" [style.transform]="open() ? 'rotate(90deg)' : 'rotate(0deg)'">
            ▶
        </span>
    </button>
    @if (open()) {
        <div class="flex flex-col gap-2 pt-2">
            <ng-content />
        </div>
    }
    `,
    host: { class: 'block' },
})
export class AccordionComponent {
    readonly open = model(true);
}
