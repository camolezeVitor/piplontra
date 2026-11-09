import { Component, HostListener, inject } from "@angular/core";
import { AudioService, AvailableAudios } from "@shared/components/audio/audio.service";
import { CardComponent } from "@shared/components/card/card.component";

@Component({
    selector: "pip-use-radaway",
    template: `
    <pip-card class="
        bg-white! outline-white text-black/50! cursor-pointer select-none
        hover:bg-white/80! hover:outline-2 hover:outline-offset-2
    ">
        RADAWAY (5)
    </pip-card>
    `,
    imports: [CardComponent]
})
export class UseRadawayComponent {
    private readonly _audioService = inject(AudioService);

    @HostListener('click', ['$event'])
    public onClick(event: Event) {
        this._audioService.playInstantAudio(AvailableAudios.PipboySelect);
    }
}