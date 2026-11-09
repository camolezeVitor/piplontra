import { Component, computed, inject } from "@angular/core";
import { PanZoomViewportComponent } from "@shared/components/pan-zoom-viewport/pan-zoom-viewport.component";
import { MapService } from "@shared/services/map.service";

/**
 * Camada de pulses (botão do meio / Alt+clique) — mundo (dentro do pan-zoom),
 * um anel que expande e desaparece sozinho (`MapService.addPulse`), contra-
 * escalado pra ter sempre o mesmo tamanho na tela independente do zoom,
 * igual label/health bar dos objetos.
 */
@Component({
    selector: 'pip-map-pulse-layer',
    template: `
    @for (pulse of map.pulses(); track pulse.id) {
        <div
            class="absolute pointer-events-none flex flex-col items-center"
            [style.left.px]="pulse.x"
            [style.top.px]="pulse.y"
            [style.transform]="counterScale()"
            style="transform-origin: center"
        >
            <div class="pip-pulse-ring" [style.border-color]="pulse.color ?? '#ffffff'"></div>
            @if (pulse.label) {
                <span
                    class="mt-1 text-[10px] leading-none bg-black/85 px-1 border whitespace-nowrap"
                    [style.color]="pulse.color ?? '#ffffff'"
                    [style.border-color]="pulse.color ?? 'rgba(255,255,255,0.4)'"
                >{{ pulse.label }}</span>
            }
        </div>
    }
    `,
    styles: `
    .pip-pulse-ring {
        width: 16px;
        height: 16px;
        border: 2px solid #fff;
        border-radius: 50%;
        animation: pip-pulse-expand 1s ease-out forwards;
    }
    @keyframes pip-pulse-expand {
        0% { transform: scale(0.4); opacity: 1; }
        100% { transform: scale(3.5); opacity: 0; }
    }
    `,
    host: { class: 'contents' },
})
export class MapPulseLayerComponent {
    protected readonly map = inject(MapService);
    private readonly viewport = inject(PanZoomViewportComponent);

    protected readonly counterScale = computed(() => `translate(-50%, -50%) scale(${1 / this.viewport.scale()})`);
}
