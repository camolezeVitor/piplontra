import { Component, computed, input, numberAttribute } from "@angular/core";

@Component({
    selector: "pip-progressbar",
    template: `
    <div [style.width.%]="transformedProgress()" class="bg-white h-full"></div>
    `,
    host: {class: "w-full border border-white h-2.5"}
})
export class ProgressbarComponent {
    public progress = input<number | string>(0, {
        transform: numberAttribute as any
    })
    private _progress = computed(() => Number(this.progress()))

    public transformedProgress = computed(() => {
        if (this._progress() > 100) return 100;
        if (this._progress() < 0) return 0;
        return this._progress();
    })
}