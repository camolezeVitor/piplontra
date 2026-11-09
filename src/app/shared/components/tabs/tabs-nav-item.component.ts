import { Component, computed, HostListener, inject, input } from "@angular/core";
import { TabsComponent } from "./tabs.component";
import { cn } from "@shared/utils/cn";
import { AudioService, AvailableAudios } from "../audio/audio.service";
import { TabsNavComponent } from "./tabs-nav.component";

@Component({
    selector: "pip-tabs-nav-item",
    template: `
    <div class="flex flex-row items-end h-fit">
        @if (isActive() && showBorder()) {
            <div class="h-5 border-r border-white"></div>    
        }
        <div [class]="classes()">
            <ng-content />
        </div>
        @if (isActive() && showBorder()) {
            <div class="h-5 border-l border-white"></div>    
        }
        
    </div>
    `
})
export class TabsNavItemComponent {
    private readonly _tabsNavComponent = inject(TabsNavComponent);
    private readonly _tabsComponent = inject(TabsComponent);
    private readonly _audioService = inject(AudioService);

    public showBorder = computed(() =>
        this._tabsNavComponent.showBorder()
    )

    public indexInput = input.required<number | string>({alias: "index"});
    public index = computed(() => Number(this.indexInput()));
    public isActive = computed(() => this._tabsComponent.active() == this.index());

    @HostListener('click', ['$event'])
    public onClick(event: Event) {
        if (!this.isActive()) {
            this._audioService.playInstantAudio(AvailableAudios.PipboyOk);
        }
        this._tabsComponent.setActive(this.index());
    }

    public classes = computed(() => {
        const baseClases = "flex flex-row px-4 text-white/50 py-2 cursor-pointer select-none bg-black";
        const activeClasses = this.isActive() ? 'font-black !text-white -mb-1 !pb-3' : ''
        return cn(baseClases, activeClasses);
    })
}