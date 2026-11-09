import { Component, HostListener, inject } from "@angular/core";
import { AdminService } from "@shared/services/admin.service";
import { MapService } from "@shared/services/map.service";
import { MapObjectComponent } from "./map-object.component";

function isTypingInField(): boolean {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return false;
    return active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable;
}

/**
 * Camada de objetos do mapa (mundo — dentro do pan-zoom). Visível pra todos;
 * Ctrl+C/Ctrl+V, R/Shift+R, Backspace/Delete e Esc da seleção só funcionam
 * pro Mestre. Ctrl+C/V, R/Shift+R e Backspace/Delete ficam fora de campos de
 * texto (pra não roubar atalhos normais de digitação) — Esc pra desselecionar
 * funciona em qualquer lugar.
 */
@Component({
    selector: 'pip-objects-layer',
    template: `
    @for (object of map.visibleObjects(); track object.id) {
        <pip-map-object [object]="object" />
    }
    `,
    host: { class: 'contents' },
    imports: [MapObjectComponent],
})
export class ObjectsLayerComponent {
    protected readonly map = inject(MapService);
    private readonly admin = inject(AdminService);

    @HostListener('document:keydown', ['$event'])
    protected onKeydown(event: KeyboardEvent): void {
        if (!this.admin.isAdmin()) return;

        if (event.key === 'Escape') {
            if (this.map.viewEditMode()) {
                this.map.exitViewEditMode();
                return;
            }
            this.map.clearSelection();
            return;
        }

        if ((event.key === 'r' || event.key === 'R') && !isTypingInField()) {
            this.rotateSelected(event.shiftKey ? 45 : 90);
            event.preventDefault();
            return;
        }

        if ((event.key === 'Backspace' || event.key === 'Delete') && !isTypingInField()) {
            if (this.map.selectedObjectIds().length) {
                this.map.removeSelected();
                event.preventDefault();
            }
            return;
        }

        if (!(event.ctrlKey || event.metaKey) || isTypingInField()) return;

        if (event.key === 'c' || event.key === 'C') {
            const id = this.map.selectedObjectId();
            if (id) {
                this.map.copyObject(id);
                event.preventDefault();
            }
        } else if (event.key === 'v' || event.key === 'V') {
            const pasted = this.map.pasteClipboard();
            if (pasted) event.preventDefault();
        }
    }

    /** Gira a direção da lanterna (cone) selecionada — não faz nada pra luz de ponto ou outros tipos de objeto. */
    private rotateSelected(deltaDeg: number): void {
        const id = this.map.selectedObjectId();
        const object = id ? this.map.objects().find(o => o.id === id) : undefined;
        if (!object || object.type !== 'illumination' || object.lightKind !== 'cone') return;

        const angle = (((object.lightAngle ?? 0) + deltaDeg) % 360 + 360) % 360;
        this.map.updateObject(object.id, { lightAngle: angle });
    }
}
