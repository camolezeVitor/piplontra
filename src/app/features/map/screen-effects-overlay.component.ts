import { Component, inject } from "@angular/core";
import type { ISourceOptions } from "@tsparticles/engine";
import { MapService } from "@shared/services/map.service";
import { ParticleEffectComponent } from "./particle-effect.component";
import { RadiationEffectComponent } from "./radiation-effect.component";

const BASE: ISourceOptions = {
    fullScreen: { enable: false },
    fpsLimit: 60,
    detectRetina: true,
};

const RAIN_OPTIONS: ISourceOptions = {
    ...BASE,
    particles: {
        number: { value: 150 },
        color: { value: '#aaccff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5 },
        size: { value: { min: 1, max: 2 } },
        move: {
            enable: true,
            direction: 'bottom',
            straight: true,
            speed: { min: 15, max: 25 },
            outModes: { default: 'out' },
        },
    },
};

const SNOW_OPTIONS: ISourceOptions = {
    ...BASE,
    particles: {
        number: { value: 100 },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: { min: 0.4, max: 0.9 } },
        size: { value: { min: 1.5, max: 4 } },
        move: {
            enable: true,
            direction: 'bottom',
            straight: false,
            random: true,
            speed: { min: 1, max: 3 },
            outModes: { default: 'out' },
        },
    },
};

const FOG_OPTIONS: ISourceOptions = {
    ...BASE,
    particles: {
        number: { value: 10 },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: { min: 0.08, max: 0.2 } },
        size: { value: { min: 120, max: 220 } },
        move: {
            enable: true,
            direction: 'right',
            straight: false,
            random: true,
            speed: { min: 0.3, max: 0.8 },
            outModes: { default: 'out' },
        },
    },
};

const HEAT_OPTIONS: ISourceOptions = {
    ...BASE,
    particles: {
        number: { value: 60 },
        color: { value: ['#ffb347', '#ff8c42', '#ffd27f'] },
        shape: { type: 'circle' },
        opacity: { value: { min: 0.2, max: 0.7 }, animation: { enable: true, speed: 1, sync: false } },
        size: { value: { min: 1, max: 3 } },
        move: {
            enable: true,
            direction: 'top',
            straight: false,
            random: true,
            speed: { min: 0.5, max: 1.5 },
            outModes: { default: 'out' },
        },
    },
};

/**
 * Efeitos de tela (radiação, sol quente, chuva, névoa, neve) — ficam por cima
 * de tudo, em TELA (não em mundo): não são afetados por pan/zoom do mapa,
 * então vivem fora de `pip-pan-zoom-viewport` (ver `map.component.ts`).
 * Cumulativos — qualquer combinação pode estar ativa ao mesmo tempo.
 *
 * Chuva/neve/névoa/sol-quente usam tsParticles (`pip-particle-effect`);
 * radiação usa PowerGlitch (`pip-radiation-effect`). `pointer-events: none`
 * em tudo pra nunca atrapalhar clique/drag no mapa por baixo.
 */
@Component({
    selector: 'pip-screen-effects-overlay',
    template: `
    @if (map.effects().length) {
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-10">
            @if (map.effects().includes('radiation')) {
                <pip-radiation-effect />
            }
            @if (map.effects().includes('heat')) {
                <pip-particle-effect effectId="pip-fx-heat" [options]="heatOptions" />
            }
            @if (map.effects().includes('rain')) {
                <pip-particle-effect effectId="pip-fx-rain" [options]="rainOptions" />
            }
            @if (map.effects().includes('fog')) {
                <pip-particle-effect effectId="pip-fx-fog" [blurPx]="24" [options]="fogOptions" />
            }
            @if (map.effects().includes('snow')) {
                <pip-particle-effect effectId="pip-fx-snow" [options]="snowOptions" />
            }
        </div>
    }
    `,
    host: { class: 'contents' },
    imports: [ParticleEffectComponent, RadiationEffectComponent],
})
export class ScreenEffectsOverlayComponent {
    protected readonly map = inject(MapService);

    protected readonly rainOptions = RAIN_OPTIONS;
    protected readonly snowOptions = SNOW_OPTIONS;
    protected readonly fogOptions = FOG_OPTIONS;
    protected readonly heatOptions = HEAT_OPTIONS;
}
