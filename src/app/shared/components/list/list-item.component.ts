import { booleanAttribute, Component, computed, HostListener, inject, input, output, signal } from "@angular/core";
import { cn } from "@shared/utils/cn";
import { AudioService, AvailableAudios } from "../audio/audio.service";

@Component({
    selector: "pip-list-item",
    template: `
    <ng-content />
    `,
    host: {
        '[class]': 'classes()'
    },
})
export class ListItemComponent {
    private readonly _audioService = inject(AudioService);

    public isActive = input<boolean | string>(false, {
        transform: booleanAttribute as any
    });
    public value = input<any>();
    public onClick = output<void | any>();

    @HostListener('mouseenter')
    public _onMouseEnter() {
        if (!this.isActive()) {
            this._audioService.playInstantAudio(AvailableAudios.PipboyHover);
        }
    }

    @HostListener('click')
    public _onClick() {
        if (!this.isActive()) {
            this._audioService.playInstantAudio(AvailableAudios.PipboySelect);
        }

        this.onClick.emit(this.value() ?? undefined);
    }

    public classes = computed(() => {
        const base = "w-full flex px-4 py-2 select-none cursor-pointer text-white font-black hover:bg-white/50";
        const activeStyles = this.isActive() ? 'bg-white text-black/80' : '';
        return cn(base, activeStyles)
    })
}