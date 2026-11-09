import { NgClass } from "@angular/common";
import { booleanAttribute, Component, computed, input } from "@angular/core";
import { cn } from "@shared/utils/cn";

@Component({
    selector: "pip-tabs-nav",
    template: `
    <section class="flex flex-col w-full">
        <nav [class]="classes()" [ngClass]="{
            'border-b border-white': showBorder()
        }">
            <ng-content />
        </nav>    
        @if (showBorder()) {
            <div class="w-full flex flex-row justify-between">
                <div class="h-2.5 border-l border-white"></div>
                <div class="h-2.5 border-r border-white"></div>
            </div>
        }
    </section>
    `,
    imports: [NgClass],
})
export class TabsNavComponent {
    public classesInput = input<string>("", {alias: 'class'});
    public classes = computed(() => cn(this.classesInput(), 'w-full flex flex-row'))

    public showBorder = input<boolean | string>(true, {
        transform: booleanAttribute as any
    });
}