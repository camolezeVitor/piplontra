import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from "@angular/core";
import { clamp } from "@shared/utils/number";

interface DragStart {
    pointerId: number;
    clientX: number;
    clientY: number;
    offsetX: number;
    offsetY: number;
}

interface RectSelectStart {
    pointerId: number;
    clientX: number;
    clientY: number;
}

/** Emitido quando Ctrl/Cmd, Alt ou o botão do meio clicam em vez de iniciar o pan. */
export interface WorldClickEvent {
    worldX: number;
    worldY: number;
    clientX: number;
    clientY: number;
    shiftKey: boolean;
    altKey: boolean;
    ctrlKey: boolean;
    middleButton: boolean;
}

/** Emitido ao soltar um Shift+arrastar — retângulo de seleção, em coordenadas de mundo. */
export interface RectSelectEvent {
    worldX1: number;
    worldY1: number;
    worldX2: number;
    worldY2: number;
    additive: boolean;
}

interface RulerTick {
    index: number;
    /** Posição central da célula em px de tela (left pra coluna, top pra linha). */
    pos: number;
    label: string;
}

const RULER_SIZE = 16;
/** Espaçamento mínimo entre rótulos, em px de tela, antes de pular células. */
const MIN_LABEL_SPACING = 24;

/** 0→A, 25→Z, 26→AA... (base-26 tipo colunas de planilha); negativos viram "-A", "-B"... */
export function columnLabel(index: number): string {
    const negative = index < 0;
    let n = Math.abs(index);
    let label = '';
    do {
        label = String.fromCharCode(65 + (n % 26)) + label;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return negative ? `-${label}` : label;
}

/** Arredonda pra cima pro próximo "número bonito" (1, 2, 5, 10, 20, 50, 100...). */
function niceStep(raw: number): number {
    if (raw <= 1) return 1;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const n = raw / pow;
    const niceN = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return niceN * pow;
}

/**
 * Viewport genérico com pan (arrastar) e zoom (scroll, centrado no cursor) para
 * qualquer conteúdo projetado. Também desenha um grid infinito de `gridSize` px
 * (em escala 1) sobre o conteúdo, sempre alinhado aos mesmos tiles independente
 * do zoom/pan atual — o `background-size`/`background-position` do grid usam a
 * mesma matemática da transform do mundo, então as linhas nunca desalinham.
 */
@Component({
    selector: 'pip-pan-zoom-viewport',
    template: `
    <div class="absolute inset-0" [style.transform]="worldTransform()" style="transform-origin: 0 0">
        <ng-content />
    </div>
    <div
        class="absolute inset-0 pointer-events-none"
        [style.background-image]="gridBackgroundImage"
        [style.background-size]="gridBackgroundSize()"
        [style.background-position]="gridBackgroundPosition()"
    ></div>
    <div class="absolute top-0 left-0 right-0 bg-black/70 border-b border-white/30 overflow-hidden pointer-events-none z-10" [style.height.px]="rulerSize" [style.left.px]="rulerSize">
        @for (col of rulerColumns(); track col.index) {
            <span class="absolute top-0 -translate-x-1/2 text-[8px] leading-none text-white/80 flex items-center justify-center" [style.left.px]="col.pos" [style.height.px]="rulerSize">
                {{ col.label }}
            </span>
        }
    </div>
    <div class="absolute top-0 left-0 bottom-0 bg-black/70 border-r border-white/30 overflow-hidden pointer-events-none z-10" [style.width.px]="rulerSize" [style.top.px]="rulerSize">
        @for (row of rulerRows(); track row.index) {
            <span class="absolute left-0 -translate-y-1/2 text-[8px] leading-none text-white/80 flex items-center justify-center" [style.top.px]="row.pos" [style.width.px]="rulerSize">
                {{ row.label }}
            </span>
        }
    </div>
    <div class="absolute top-0 left-0 bg-black/80 border-r border-b border-white/30 z-20" [style.width.px]="rulerSize" [style.height.px]="rulerSize"></div>
    @if (selectionRect(); as rect) {
        <div
            class="absolute border border-dashed border-white bg-white/10 pointer-events-none z-20"
            [style.left.px]="rect.x"
            [style.top.px]="rect.y"
            [style.width.px]="rect.w"
            [style.height.px]="rect.h"
        ></div>
    }
    <div class="absolute bottom-2 right-2 z-20 bg-black/85 border border-white px-2 py-1 text-xs pointer-events-none">
        {{ zoomPercent() }}%
    </div>
    <button
        type="button"
        class="absolute bottom-2 left-2 z-20 bg-black/85 border border-white px-2 py-1 text-xs cursor-pointer hover:bg-white hover:text-black"
        (click)="resetView()"
    >RESETAR</button>
    `,
    host: {
        '[class]': 'hostClasses()',
    },
})
export class PanZoomViewportComponent {
    readonly minZoom = input(0.1);
    readonly maxZoom = input(8);
    readonly gridSize = input(16);

    readonly scale = signal(1);
    readonly offsetX = signal(0);
    readonly offsetY = signal(0);
    readonly dragging = signal(false);

    /** Ctrl/Cmd, Alt ou botão do meio num ponto do mundo (não inicia pan). */
    readonly worldClick = output<WorldClickEvent>();
    /** Soltar um Shift+arrastar sobre o vazio — retângulo de seleção. */
    readonly rectSelect = output<RectSelectEvent>();

    /** Retângulo de seleção em andamento, em px de TELA (pra desenhar o overlay). */
    readonly selectionRect = signal<{ x: number; y: number; w: number; h: number } | null>(null);

    readonly zoomPercent = computed(() => Math.round(this.scale() * 100));

    protected readonly hostClasses = computed(() =>
        `block relative w-full h-full overflow-hidden touch-none select-none ${this.dragging() ? 'cursor-grabbing' : 'cursor-grab'}`
    );

    protected readonly worldTransform = computed(() =>
        `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.scale()})`
    );

    protected readonly gridBackgroundImage =
        'repeating-linear-gradient(to right, rgba(255,255,255,.15) 0 1px, transparent 1px 100%),' +
        'repeating-linear-gradient(to bottom, rgba(255,255,255,.15) 0 1px, transparent 1px 100%)';

    protected readonly gridBackgroundSize = computed(() => {
        const tile = this.scale() * this.gridSize();
        return `${tile}px ${tile}px`;
    });
    protected readonly gridBackgroundPosition = computed(() =>
        `${this.offsetX()}px ${this.offsetY()}px`
    );

    protected readonly rulerSize = RULER_SIZE;

    /**
     * Régua de coordenadas nas bordas (fora da transform — tela, não mundo —
     * então fica "grudada" independente do pan/zoom). Lê o tamanho do
     * viewport na hora (não um signal via ResizeObserver) porque só precisa
     * estar atualizado quando `scale`/`offsetX`/`offsetY` mudam, que é
     * exatamente quando esse computed já recalcula.
     */
    protected readonly rulerColumns = computed<RulerTick[]>(() => {
        const scale = this.scale();
        const offsetX = this.offsetX();
        const tile = scale * this.gridSize();
        const width = this.host.getBoundingClientRect().width;

        const step = niceStep(MIN_LABEL_SPACING / tile);
        const first = Math.ceil((-offsetX / tile) / step) * step;
        const last = (width - offsetX) / tile;

        const ticks: RulerTick[] = [];
        for (let i = first; i <= last; i += step) {
            ticks.push({ index: i, pos: offsetX + i * tile + tile / 2, label: columnLabel(i) });
        }
        return ticks;
    });

    protected readonly rulerRows = computed<RulerTick[]>(() => {
        const scale = this.scale();
        const offsetY = this.offsetY();
        const tile = scale * this.gridSize();
        const height = this.host.getBoundingClientRect().height;

        const step = niceStep(MIN_LABEL_SPACING / tile);
        const first = Math.ceil((-offsetY / tile) / step) * step;
        const last = (height - offsetY) / tile;

        const ticks: RulerTick[] = [];
        for (let i = first; i <= last; i += step) {
            ticks.push({ index: i, pos: offsetY + i * tile + tile / 2, label: String(i) });
        }
        return ticks;
    });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private drag: DragStart | null = null;
    private rectSelectStart: RectSelectStart | null = null;

    resetView(): void {
        this.scale.set(1);
        this.offsetX.set(0);
        this.offsetY.set(0);
    }

    @HostListener('wheel', ['$event'])
    protected onWheel(event: WheelEvent): void {
        event.preventDefault();
        const rect = this.host.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;

        const oldScale = this.scale();
        const factor = Math.exp(-event.deltaY * 0.001);
        const newScale = clamp(oldScale * factor, [this.minZoom(), this.maxZoom()]);

        // ponto em world-space que está sob o cursor antes de mudar a escala
        const worldX = (px - this.offsetX()) / oldScale;
        const worldY = (py - this.offsetY()) / oldScale;

        this.scale.set(newScale);
        // reaplica o offset pra esse mesmo ponto continuar sob o cursor
        this.offsetX.set(px - worldX * newScale);
        this.offsetY.set(py - worldY * newScale);
    }

    @HostListener('pointerdown', ['$event'])
    protected onPointerDown(event: PointerEvent): void {
        if ((event.target as HTMLElement).closest('button')) return;

        // Ctrl/Cmd, Alt ou botão do meio (qualquer botão) = "ponto no mundo", nunca pan.
        if (event.ctrlKey || event.metaKey || event.altKey || event.button === 1) {
            event.preventDefault(); // botão do meio abre autoscroll nativo se não prevenir
            const rect = this.host.getBoundingClientRect();
            this.worldClick.emit({
                worldX: (event.clientX - rect.left - this.offsetX()) / this.scale(),
                worldY: (event.clientY - rect.top - this.offsetY()) / this.scale(),
                clientX: event.clientX,
                clientY: event.clientY,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey || event.metaKey,
                middleButton: event.button === 1,
            });
            return;
        }

        if (event.button !== 0) return; // só o botão esquerdo segue pra seleção/pan

        if (event.shiftKey) {
            this.rectSelectStart = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };
            const rect = this.host.getBoundingClientRect();
            this.selectionRect.set({ x: event.clientX - rect.left, y: event.clientY - rect.top, w: 0, h: 0 });
            (event.target as HTMLElement).setPointerCapture(event.pointerId);
            return;
        }

        this.drag = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            offsetX: this.offsetX(),
            offsetY: this.offsetY(),
        };
        this.dragging.set(true);
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
    }

    @HostListener('pointermove', ['$event'])
    protected onPointerMove(event: PointerEvent): void {
        if (this.rectSelectStart && this.rectSelectStart.pointerId === event.pointerId) {
            const rect = this.host.getBoundingClientRect();
            const x1 = this.rectSelectStart.clientX - rect.left;
            const y1 = this.rectSelectStart.clientY - rect.top;
            const x2 = event.clientX - rect.left;
            const y2 = event.clientY - rect.top;
            this.selectionRect.set({
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                w: Math.abs(x2 - x1),
                h: Math.abs(y2 - y1),
            });
            return;
        }

        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        this.offsetX.set(this.drag.offsetX + (event.clientX - this.drag.clientX));
        this.offsetY.set(this.drag.offsetY + (event.clientY - this.drag.clientY));
    }

    @HostListener('pointerup', ['$event'])
    @HostListener('pointercancel', ['$event'])
    protected onPointerUp(event: PointerEvent): void {
        if (this.rectSelectStart && this.rectSelectStart.pointerId === event.pointerId) {
            const rect = this.host.getBoundingClientRect();
            const scale = this.scale();
            const x1 = this.rectSelectStart.clientX - rect.left;
            const y1 = this.rectSelectStart.clientY - rect.top;
            const x2 = event.clientX - rect.left;
            const y2 = event.clientY - rect.top;
            this.rectSelect.emit({
                worldX1: (Math.min(x1, x2) - this.offsetX()) / scale,
                worldY1: (Math.min(y1, y2) - this.offsetY()) / scale,
                worldX2: (Math.max(x1, x2) - this.offsetX()) / scale,
                worldY2: (Math.max(y1, y2) - this.offsetY()) / scale,
                additive: true,
            });
            this.rectSelectStart = null;
            this.selectionRect.set(null);
            return;
        }

        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        this.drag = null;
        this.dragging.set(false);
    }
}
