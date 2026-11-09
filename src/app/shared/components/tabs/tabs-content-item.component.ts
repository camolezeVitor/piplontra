import { Component, computed, inject, input } from "@angular/core";
import { TabsComponent } from "./tabs.component";

@Component({
    selector: "pip-tabs-content-item",
    template: `@if (this._isActive()) {
        <ng-content />
    }`,
    host: {
        '[class]': "classes()"
    }
})
export class TabsContentItemComponent {
    private readonly _tabsComponent = inject(TabsComponent);
    public readonly _isActive = computed(() => this.index() === this._tabsComponent.active())
    public indexInput = input.required<string | number>({alias: "index"});
    public index = computed(() => Number(this.indexInput()));

    public classes = computed(() =>
        `${this._isActive() ? 'block' : 'hidden'} h-full w-full overflow-auto` 
    )
}