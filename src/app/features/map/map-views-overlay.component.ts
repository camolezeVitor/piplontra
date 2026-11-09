import { Component, computed, inject } from "@angular/core";
import { PanZoomViewportComponent } from "@shared/components/pan-zoom-viewport/pan-zoom-viewport.component";
import { MapViewPoint } from "@shared/models/game-map";
import { AdminService } from "@shared/services/admin.service";
import { MapService } from "@shared/services/map.service";

const TILE = 16;

// Mesma ideia (e mesmo tamanho) da caixa fixa da iluminação — ver
// `lighting-overlay.component.ts` pro histórico de por que não é maior.
const BOUNDS_LEFT = -384;
const BOUNDS_TOP = -384;
const BOUNDS_SIZE = 1536;

function toPointsAttr(points: MapViewPoint[]): string {
    return points.map(p => `${p.x * TILE},${p.y * TILE}`).join(' ');
}

/** Centro aproximado (média dos vértices) em px de mundo — só pra posicionar o label. */
function centroid(points: MapViewPoint[]): { x: number; y: number } {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x: x * TILE, y: y * TILE };
}

/**
 * Névoa de guerra por polígonos: se alguma "view" estiver habilitada, os
 * jogadores só enxergam a união das views habilitadas — o resto fica
 * totalmente preto. Mestre sempre vê tudo, a menos que ligue "ver como
 * jogador" (`MapService.previewAsPlayer`, mesmo signal usado pela iluminação).
 *
 * Como são polígonos com preenchimento sólido (sem gradiente), ao contrário
 * da iluminação, sobrepor duas views não tem o problema de uma "apagar" a
 * outra — preto é preto, a ordem de desenho não importa aqui.
 *
 * Também desenha, só pro Mestre (`showEditAids`), o contorno de todas as
 * views salvas (cheia = habilitada, tracejada = desabilitada) e o polígono
 * em desenho no momento (`MapService.drawingView`), pra servir de guia.
 */
@Component({
    selector: 'pip-map-views-overlay',
    template: `
    @if (restrictionActive() || showEditAids()) {
        <svg
            class="absolute pointer-events-none"
            [style.left.px]="boundsLeft"
            [style.top.px]="boundsTop"
            [attr.width]="boundsSize"
            [attr.height]="boundsSize"
            [attr.viewBox]="viewBox"
        >
            @if (restrictionActive()) {
                <defs>
                    <mask id="pip-views-mask" maskUnits="userSpaceOnUse" [attr.x]="boundsLeft" [attr.y]="boundsTop" [attr.width]="boundsSize" [attr.height]="boundsSize">
                        <rect [attr.x]="boundsLeft" [attr.y]="boundsTop" [attr.width]="boundsSize" [attr.height]="boundsSize" fill="white" />
                        @for (view of enabledViewPolygons(); track view.id) {
                            <polygon [attr.points]="view.pointsAttr" fill="black" />
                        }
                    </mask>
                </defs>
                <rect
                    [attr.x]="boundsLeft"
                    [attr.y]="boundsTop"
                    [attr.width]="boundsSize"
                    [attr.height]="boundsSize"
                    fill="black"
                    mask="url(#pip-views-mask)"
                />
            }

            @if (showEditAids()) {
                @for (view of savedViewPolygons(); track view.id) {
                    <polygon
                        [attr.points]="view.pointsAttr"
                        fill="none"
                        [attr.stroke]="view.enabled ? '#22d3ee' : 'rgba(255,255,255,0.4)'"
                        stroke-width="2"
                        [attr.stroke-dasharray]="view.enabled ? null : '6 4'"
                    />
                }
                @if (drawingPointsAttr(); as attr) {
                    <polyline [attr.points]="attr" fill="none" stroke="#facc15" stroke-width="2" stroke-dasharray="4 3" />
                    @for (point of drawingPoints(); track point.x + '_' + point.y) {
                        <circle [attr.cx]="point.x * tile" [attr.cy]="point.y * tile" r="4" fill="#facc15" />
                    }
                }
            }
        </svg>
    }
    @if (showEditAids()) {
        @for (view of labeledViews(); track view.id) {
            <span
                class="absolute whitespace-nowrap text-[9px] leading-none px-1 border pointer-events-none"
                [style.left.px]="view.x"
                [style.top.px]="view.y"
                [style.transform]="counterScale()"
                [style.color]="view.enabled ? '#22d3ee' : 'rgba(255,255,255,0.6)'"
                [style.border-color]="view.enabled ? '#22d3ee' : 'rgba(255,255,255,0.4)'"
                style="transform-origin: center; background: rgba(0,0,0,0.85)"
            >{{ view.label || 'VIEW SEM NOME' }}</span>
        }
    }
    `,
    host: { class: 'contents' },
})
export class MapViewsOverlayComponent {
    private readonly map = inject(MapService);
    private readonly admin = inject(AdminService);
    private readonly viewport = inject(PanZoomViewportComponent);

    protected readonly tile = TILE;
    protected readonly boundsLeft = BOUNDS_LEFT;
    protected readonly boundsTop = BOUNDS_TOP;
    protected readonly boundsSize = BOUNDS_SIZE;
    protected readonly viewBox = `${BOUNDS_LEFT} ${BOUNDS_TOP} ${BOUNDS_SIZE} ${BOUNDS_SIZE}`;

    /** A restrição só vale pra quem não é Mestre — ou pro Mestre quando ele pede pra conferir. */
    protected readonly restrictionActive = computed(() => {
        const previewing = !this.admin.isAdmin() || this.map.previewAsPlayer();
        return previewing && this.map.views().some(v => v.enabled);
    });

    /** Guias de edição (contornos + polígono em desenho) só aparecem pro Mestre, fora do modo "ver como jogador". */
    protected readonly showEditAids = computed(() => this.admin.isAdmin() && !this.map.previewAsPlayer());

    protected readonly enabledViewPolygons = computed(() =>
        this.map.views()
            .filter(v => v.enabled)
            .map(v => ({ id: v.id, pointsAttr: toPointsAttr(v.points) })),
    );

    protected readonly savedViewPolygons = computed(() =>
        this.map.views().map(v => ({ id: v.id, enabled: v.enabled, pointsAttr: toPointsAttr(v.points) })),
    );

    protected readonly drawingPoints = computed(() => this.map.drawingView());
    protected readonly drawingPointsAttr = computed(() => {
        const points = this.drawingPoints();
        return points.length ? toPointsAttr(points) : null;
    });

    /** Label de cada view salva, centralizado no polígono, contra-escalado (tamanho fixo em qualquer zoom). */
    protected readonly labeledViews = computed(() =>
        this.map.views().map(v => ({ id: v.id, label: v.label, enabled: v.enabled, ...centroid(v.points) })),
    );

    protected readonly counterScale = computed(() => `translate(-50%, -50%) scale(${1 / this.viewport.scale()})`);
}
