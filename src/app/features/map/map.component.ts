import { Component, inject } from "@angular/core";
import { PanZoomViewportComponent, RectSelectEvent, WorldClickEvent, columnLabel } from "@shared/components/pan-zoom-viewport/pan-zoom-viewport.component";
import { AdminService } from "@shared/services/admin.service";
import { CombatCalculatorUiService } from "@shared/services/combat-calculator-ui.service";
import { MapService } from "@shared/services/map.service";
import { LightingOverlayComponent } from "./lighting-overlay.component";
import { MapObjectContextMenuComponent } from "./map-object-context-menu.component";
import { MapPulseLayerComponent } from "./map-pulse-layer.component";
import { MapViewsOverlayComponent } from "./map-views-overlay.component";
import { ObjectsLayerComponent } from "./objects-layer.component";
import { ScreenEffectsOverlayComponent } from "./screen-effects-overlay.component";

const TILE = 16;

/**
 * Aba MAPA. O viewport (pan/zoom) e os objetos são visíveis para todos; a
 * edição (arrastar/objetos) só funciona para o Mestre (gating interno em
 * `MapObjectComponent`). O painel de gerenciamento (`pip-map-master-panel`)
 * fica fora daqui, como painel lateral em `app.ts` — igual `pip-players-pannel`.
 *
 * Atalhos do grid (ver `onWorldClick`/`onRectSelect`):
 * - Ctrl+clique num tile vazio cria um objeto ali; Ctrl+Shift+clique cria e já abre o editor.
 * - Shift+arrastar desenha um retângulo que soma objetos à seleção.
 * - Alt+clique copia as coordenadas do tile (ex. "C5") pra área de transferência.
 * - Botão do meio dá um pulse no tile, visível pra todo mundo.
 * - Backspace/Delete remove os objetos selecionados (`ObjectsLayerComponent`).
 */
@Component({
    selector: 'pip-map',
    template: `
    <pip-pan-zoom-viewport
        [minZoom]="0.1"
        [maxZoom]="8"
        [gridSize]="16"
        (worldClick)="onWorldClick($event)"
        (rectSelect)="onRectSelect($event)"
    >
        @if (map.backgroundImage(); as bg) {
            <img
                [src]="bg"
                alt=""
                class="absolute top-0 left-0 pointer-events-none select-none"
                style="image-rendering: pixelated; max-width: none; height: auto"
            />
        } @else {
            <div class="absolute top-0 left-0 w-64 h-64 flex items-center justify-center
                        border border-dashed border-white/40 text-xs opacity-60 text-center p-4">
                MAPA AINDA NÃO CONFIGURADO
            </div>
        }
        <pip-objects-layer />
        <pip-lighting-overlay />
        <pip-map-views-overlay />
        <pip-map-pulse-layer />
    </pip-pan-zoom-viewport>

    <button
        type="button"
        class="absolute bottom-2 right-16 z-20 bg-black/85 border border-white px-2 py-1 text-xs cursor-pointer hover:bg-white hover:text-black"
        (click)="calculatorUi.toggle()"
    >CALC</button>

    <pip-screen-effects-overlay />

    <pip-map-object-context-menu />
    `,
    host: { class: 'block relative w-full h-full' },
    imports: [
        PanZoomViewportComponent,
        ObjectsLayerComponent,
        MapObjectContextMenuComponent,
        LightingOverlayComponent,
        ScreenEffectsOverlayComponent,
        MapPulseLayerComponent,
        MapViewsOverlayComponent,
    ],
})
export class MapComponent {
    protected readonly map = inject(MapService);
    protected readonly calculatorUi = inject(CombatCalculatorUiService);
    private readonly admin = inject(AdminService);

    protected onWorldClick(event: WorldClickEvent): void {
        // Pulse e cópia de coordenada são informativos — qualquer um pode usar.
        if (event.middleButton) {
            this.pulseAtWorld(event.worldX, event.worldY, undefined, true);
            return;
        }
        if (event.altKey) {
            this.copyCoords(event.worldX, event.worldY);
            return;
        }

        // Ctrl+clique cria objeto (ou soma vértice, no modo de desenhar views) — isso sim é edição, só Mestre.
        if (!event.ctrlKey || !this.admin.isAdmin()) return;

        if (this.map.viewEditMode()) {
            // vértice de polígono: encosta no CANTO do grid mais próximo, não na célula.
            this.map.addViewPoint({
                x: Math.round(event.worldX / TILE),
                y: Math.round(event.worldY / TILE),
            });
            return;
        }

        const object = this.map.addObject({
            x: Math.floor(event.worldX / TILE),
            y: Math.floor(event.worldY / TILE),
        });
        if (event.shiftKey) {
            this.map.contextMenu.set({ objectId: object.id, x: event.clientX, y: event.clientY });
        }
    }

    protected onRectSelect(event: RectSelectEvent): void {
        if (!this.admin.isAdmin()) return;
        const minX = Math.floor(Math.min(event.worldX1, event.worldX2) / TILE);
        const maxX = Math.floor(Math.max(event.worldX1, event.worldX2) / TILE);
        const minY = Math.floor(Math.min(event.worldY1, event.worldY2) / TILE);
        const maxY = Math.floor(Math.max(event.worldY1, event.worldY2) / TILE);

        const ids = this.map.objects()
            .filter(o => o.x >= minX && o.x <= maxX && o.y >= minY && o.y <= maxY)
            .map(o => o.id);
        this.map.selectObjects(ids, { additive: event.additive });
    }

    /** `broadcast`: ping pra mesa toda (botão do meio); senão só um feedback local (Alt+clique). */
    private pulseAtWorld(worldX: number, worldY: number, label?: string, broadcast = false): void {
        const x = Math.floor(worldX / TILE) * TILE + TILE / 2;
        const y = Math.floor(worldY / TILE) * TILE + TILE / 2;
        if (broadcast) this.map.ping(x, y, label);
        else this.map.addPulse(x, y, label);
    }

    private copyCoords(worldX: number, worldY: number): void {
        const col = Math.floor(worldX / TILE);
        const row = Math.floor(worldY / TILE);
        const label = `${columnLabel(col)}${row}`;
        navigator.clipboard?.writeText(label).catch(() => { /* sem permissão de clipboard — só não copia */ });
        this.pulseAtWorld(worldX, worldY, label);
    }
}
