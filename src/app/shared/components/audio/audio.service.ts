import { Injectable, signal } from "@angular/core";

export const AvailableAudios = {
    PipboyOk: "/audio/ok.ogg",
    PipboyError: "/audio/error.ogg",
    PipboyHover: "/audio/hover.ogg",
    PipboySelect: "/audio/select.ogg",
    PipboyDamage: "/audio/damage.ogg"
}

export interface AudioQueueItem {
    src: string;
    waitTillAudioComplete?: boolean;
}

@Injectable({ providedIn: "root" })
export class AudioService {
    private preloadedAudios: Map<string, HTMLAudioElement> = new Map();
    public audioQueue = signal<Array<AudioQueueItem>>([]);

    constructor() {
        this.preloadAudio(AvailableAudios.PipboyOk);
        this.preloadAudio(AvailableAudios.PipboyError);
        this.preloadAudio(AvailableAudios.PipboyHover);
        this.preloadAudio(AvailableAudios.PipboySelect);
        this.preloadAudio(AvailableAudios.PipboyDamage);
    }

    private preloadAudio(src: string): void {
        const audio = new Audio(src);
        audio.load();
        this.preloadedAudios.set(src, audio);
    }
    
    public playInstantAudio(src: string): void {
        const audioEl = this.preloadedAudios.get(src);
        
        if (audioEl) {
            audioEl.currentTime = 0; 
            audioEl.play().catch(e => console.error('Erro ao tocar áudio pré-carregado:', e));
            return;
        }
        
        // Toca um áudio não pré-carregado instantaneamente, mas com risco de delay.
        const newAudio = new Audio(src);
        newAudio.play().catch(e => console.error('Erro ao tocar áudio novo:', e));
    }

    public pushAudio(
        src: string,
        waitTillAudioComplete: boolean = true
    ) {
        this.audioQueue.update(q => [...q, {src, waitTillAudioComplete}]);
    }

    public shiftQueue() {
        this.audioQueue.update(q => {
            q.shift();
            return [...q];
        });
    }
}