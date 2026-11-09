import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from "@angular/core";
import type { GlitchResult } from "powerglitch";

/**
 * Efeito de radiação — scanlines esverdeadas com um glitch leve e periódico,
 * via PowerGlitch (fatia/sacode o próprio elemento em intervalos, em vez de
 * tentar imitar isso com keyframes CSS escritos à mão). Import dinâmico:
 * só baixa a lib quando o efeito é realmente ligado.
 */
@Component({
    selector: 'pip-radiation-effect',
    template: `<div #target class="pip-radiation-target absolute inset-0"></div>`,
    styles: `
    .pip-radiation-target {
        background: repeating-linear-gradient(
            to bottom,
            rgba(120,255,120,0.12) 0px,
            rgba(120,255,120,0.12) 1px,
            transparent 1px,
            transparent 3px
        );
        mix-blend-mode: screen;
    }
    `,
    host: { class: 'contents' },
})
export class RadiationEffectComponent implements AfterViewInit, OnDestroy {
    private readonly target = viewChild.required<ElementRef<HTMLElement>>('target');
    private glitch: GlitchResult | undefined;

    async ngAfterViewInit(): Promise<void> {
        const { PowerGlitch } = await import('powerglitch');
        this.glitch = PowerGlitch.glitch(this.target().nativeElement, {
            playMode: 'always',
            timing: { duration: 4000, iterations: Infinity },
            glitchTimeSpan: { start: 0.5, end: 0.7 },
            shake: { velocity: 15, amplitudeX: 0.1, amplitudeY: 0.05 },
            slice: { count: 6, velocity: 15, minHeight: 0.02, maxHeight: 0.15, hueRotate: true },
            pulse: false,
        });
    }

    ngOnDestroy(): void {
        this.glitch?.stopGlitch();
    }
}
