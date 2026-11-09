import { Component, computed, effect, forwardRef, input, output, signal } from "@angular/core";

@Component({
    selector: "pip-tabs",
    template: `
    <ng-content />
    `,
    host: {
        class: "w-full h-full flex flex-col overflow-auto"
    },
})
export class TabsComponent {
    public activeInput = input<number | string>(0, {alias: "activeIndex"});
    public activeInputChange = output<number | string>({alias: "activeIndexChange"});
    private internalActive = signal(Number(this.activeInput()));
    public active = this.internalActive.asReadonly();

    constructor() {

        effect(() => {
            const incoming = Number(this.activeInput());
            this.internalActive.set(incoming);
        });

        effect(() => {
            const val = this.internalActive();
            if (val !== Number(this.activeInput())) {
                this.activeInputChange.emit(val);
            }
        });

    }

    setActive(value: number) {
        this.internalActive.set(value);
    }
}