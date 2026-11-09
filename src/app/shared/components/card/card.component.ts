import { Component } from "@angular/core";

@Component({
    selector: "pip-card",
    template: `
    <ng-content />
    `,
    host: {
        class: "flex px-4 py-2 bg-white/50 text-white font-black"
    }
})
export class CardComponent {}