import { Component, effect, inject, viewChild, ElementRef, signal } from "@angular/core";
import { AudioService, AudioQueueItem } from "./audio.service";

@Component({
    selector: "pip-audio",
    template: `<audio #audio class="hidden" preload="auto"></audio>`
})
export class AudioComponent {
    private readonly _audioService = inject(AudioService);
    public audioRef = viewChild<ElementRef<HTMLAudioElement>>("audio");

    private isWaiting = false;

    constructor() {
        effect(() => {
            const audioRefSignal = this.audioRef();
            if (!audioRefSignal) return;

            const queue = this._audioService.audioQueue();
            if (queue.length === 0) return;

            if (this.isWaiting) return;

            this.processQueueItem(queue[0]);
        });
    }

    private processQueueItem(item: AudioQueueItem) {
        const audioRefSignal = this.audioRef();
        
        if (!audioRefSignal) return;
        
        const audioEl = audioRefSignal.nativeElement; 

        audioEl.src = item.src;
        
        // Não chamamos load() aqui, dependemos do pré-carregamento 
        // ou do navegador fazer o download ao setar o src.
        audioEl.play().catch(error => {
            console.warn("Play() falhou, tentando carregar primeiro:", error);
            audioEl.load();
            audioEl.play();
        });


        if (!item.waitTillAudioComplete) {
            this._audioService.shiftQueue();
            return;
        }

        this.isWaiting = true;

        audioEl.onended = () => {
            audioEl.onended = null;
            this._audioService.shiftQueue();
            this.isWaiting = false;

            const queue = this._audioService.audioQueue();
            if (queue.length > 0) {
                this.processQueueItem(queue[0]);
            }
        };
    }
}