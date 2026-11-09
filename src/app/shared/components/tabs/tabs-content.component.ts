import { Component, inject, input } from "@angular/core";
import { TabsComponent } from "./tabs.component";

@Component({
    selector: "pip-tabs-content",
    template: `
    <ng-content />
    `,
    host: {
        class: "block w-full h-full overflow-auto"
    }
})
export class TabsContentComponent {
}