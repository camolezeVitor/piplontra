import { Component } from "@angular/core";

@Component({
    selector: "pip-list",
    template: `
    <ng-content />
    `,
    host: {class: "flex flex-col gap-1 w-full"}
})
export class ListComponent {}