import { Component, OnDestroy, OnInit, input } from "@angular/core";
import type { Container, ISourceOptions, tsParticles as TsParticlesEngine } from "@tsparticles/engine";

// Import dinâmico: tsParticles só é baixado quando o Mestre liga o primeiro
// efeito de partículas, em vez de inchar o bundle inicial do app (chuva/neve/
// névoa/sol-quente são opcionais, a maioria das sessões talvez nunca use).
let enginePromise: Promise<typeof TsParticlesEngine> | null = null;
function loadEngine(): Promise<typeof TsParticlesEngine> {
    if (!enginePromise) {
        enginePromise = Promise.all([
            import('@tsparticles/engine'),
            import('@tsparticles/slim'),
        ]).then(([{ tsParticles }, { loadSlim }]) => loadSlim(tsParticles).then(() => tsParticles));
    }
    return enginePromise;
}

/**
 * Camada de partículas genérica, via tsParticles — chuva/neve/névoa/sol
 * quente (`screen-effects-overlay.component.ts`) são todos instâncias disso
 * com `options` diferentes. Cria o container no `ngOnInit`, destrói no
 * `ngOnDestroy` — então basta envolver o uso num `@if` pra ligar/desligar o
 * efeito, o Angular cuida do mount/unmount.
 */
@Component({
    selector: 'pip-particle-effect',
    template: `<div [id]="effectId()" class="absolute inset-0" [style.filter]="blurPx() ? 'blur(' + blurPx() + 'px)' : null"></div>`,
    host: { class: 'contents' },
})
export class ParticleEffectComponent implements OnInit, OnDestroy {
    readonly effectId = input.required<string>();
    readonly options = input.required<ISourceOptions>();
    /** Desfoque opcional (ex.: pra névoa ficar com manchas borradas em vez de círculos nítidos). */
    readonly blurPx = input(0);

    private container: Container | undefined;

    async ngOnInit(): Promise<void> {
        const tsParticles = await loadEngine();
        this.container = await tsParticles.load({ id: this.effectId(), options: this.options() });
    }

    ngOnDestroy(): void {
        this.container?.destroy();
    }
}
