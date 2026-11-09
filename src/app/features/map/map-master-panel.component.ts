import { Component, computed, inject, signal } from "@angular/core";
import { AccordionComponent } from "@shared/components/accordion/accordion.component";
import { CardComponent } from "@shared/components/card/card.component";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { OutlineDirective } from "@shared/directives/outline/outline.directive";
import { TitleDirective } from "@shared/directives/text/title.directive";
import { MAP_EFFECT_TYPES, MAP_OBJECT_TYPE_COLORS, MAP_OBJECT_TYPES, MapObjectType, objectMatchesFilter } from "@shared/models/game-map";
import { AdminService } from "@shared/services/admin.service";
import { MapService } from "@shared/services/map.service";

const TYPE_LABELS: Record<MapObjectType, string> = Object.fromEntries(
    MAP_OBJECT_TYPES.map(t => [t.value, t.label]),
) as Record<MapObjectType, string>;

/**
 * Painel de gerenciamento do mapa — mesma estrutura visual de
 * `PlayersPannelComponent` ("SESSÃO"), só que na lateral direita (ver `app.ts`).
 * Só aparece pro Mestre — mesmo gating de `AdminDrawerComponent` — então o
 * componente é seguro de incluir incondicionalmente onde for usado.
 */
@Component({
    selector: 'pip-map-master-panel',
    template: `
    @if (admin.isAdmin()) {
        <div pipOutline class="flex flex-col gap-1 h-full overflow-auto">
            <header class="flex flex-col gap-2 py-2 px-3 border-b border-white">
                <p pipTitle>MAPA</p>
                <div class="flex flex-row flex-wrap items-center gap-2">
                    <pip-card
                        class="cursor-pointer select-none hover:outline-2 hover:outline-offset-2 hover:outline-white"
                        (click)="map.downloadJson()"
                    >EXPORTAR</pip-card>
                    <label>
                        <pip-card class="cursor-pointer select-none hover:outline-2 hover:outline-offset-2 hover:outline-white">IMPORTAR</pip-card>
                        <input type="file" accept="application/json" class="hidden" (change)="onImportFile($event)" />
                    </label>
                </div>
                @if (map.importError(); as err) {
                    <span class="text-red-400 text-xs">{{ err }}</span>
                }
                @if (map.persistError(); as err) {
                    <span class="text-amber-400 text-xs">{{ err }}</span>
                }
            </header>

            <pip-accordion [(open)]="infosOpen" class="py-2 px-3 border-b border-white text-xs">
                <p accordionTitle class="opacity-60 font-black">INFOS DO MAPA</p>
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">NOME</span>
                    <input class="field" type="text" [value]="map.name()" (input)="map.setName($any($event.target).value)" />
                </label>
                <label class="flex flex-col gap-1 cursor-pointer" title="Trocar imagem de fundo">
                    <span class="opacity-80">IMAGEM DE FUNDO</span>
                    @if (map.backgroundImage(); as bg) {
                        <img [src]="bg" alt="" class="w-full h-20 object-cover border border-white hover:outline-2 hover:outline-offset-2 hover:outline-white" style="image-rendering: pixelated" />
                    } @else {
                        <span class="w-full h-20 flex items-center justify-center border border-dashed border-white hover:outline-2 hover:outline-offset-2 hover:outline-white">
                            ESCOLHER IMAGEM
                        </span>
                    }
                    <input type="file" accept="image/*" class="hidden" (change)="onBackgroundImage($event)" />
                </label>
            </pip-accordion>

            <pip-accordion [(open)]="lightingOpen" class="py-2 px-3 border-b border-white text-xs">
                <p accordionTitle class="opacity-60 font-black">ILUMINAÇÃO</p>
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">VISIBILIDADE: {{ map.ambientLight() }}%</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        [value]="map.ambientLight()"
                        (input)="map.setAmbientLight($any($event.target).valueAsNumber)"
                        class="w-full accent-white cursor-pointer"
                    />
                </label>
                <label class="flex flex-row items-center gap-2 cursor-pointer" title="Ver o mapa como os jogadores veem (escuridão/luzes)">
                    <input type="checkbox" [checked]="map.previewAsPlayer()" (change)="map.previewAsPlayer.set($any($event.target).checked)" />
                    <span class="opacity-80">VER COMO JOGADOR</span>
                </label>
            </pip-accordion>

            <pip-accordion [(open)]="viewsOpen" class="py-2 px-3 border-b border-white text-xs">
                <p accordionTitle class="opacity-60 font-black">VIEWS (VISÃO LIMITADA)</p>
                <span class="opacity-60">
                    Com alguma view habilitada, jogadores só veem a união delas. Sem nenhuma, o mapa fica normal.
                </span>

                @if (map.viewEditMode()) {
                    <div class="flex flex-col gap-1 p-2 border border-yellow-400/60 bg-yellow-400/10">
                        <span class="text-yellow-300">
                            MODO DE DESENHO — Ctrl+clique no mapa soma um vértice ({{ map.drawingView().length }} até agora).
                        </span>
                        <div class="flex flex-row gap-1">
                            <button
                                type="button"
                                class="flex-1 px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
                                [disabled]="map.drawingView().length < 3"
                                (click)="map.finishDrawingView()"
                            >CONCLUIR</button>
                            <button
                                type="button"
                                class="flex-1 px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                                (click)="map.cancelDrawingView()"
                            >CANCELAR</button>
                        </div>
                        <button
                            type="button"
                            class="px-2 py-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                            (click)="map.exitViewEditMode()"
                        >SAIR DO MODO DE EDIÇÃO</button>
                    </div>
                } @else {
                    <button
                        type="button"
                        class="self-start px-2 py-0.5 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                        (click)="map.startNewView()"
                    >+ NOVA VIEW</button>
                }

                <pip-list class="flex flex-col gap-1 w-full p-0!">
                    @for (view of map.views(); track view.id) {
                        <div class="flex flex-row items-center gap-1 p-1 border border-white/20">
                            <input type="checkbox" [checked]="view.enabled" (change)="map.toggleViewEnabled(view.id)" title="Habilitada" />
                            <input
                                class="field flex-1 min-w-0"
                                type="text"
                                [value]="view.label"
                                placeholder="VIEW SEM NOME"
                                (change)="map.updateView(view.id, { label: $any($event.target).value })"
                            />
                            <button
                                type="button"
                                class="px-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                                (click)="map.removeView(view.id)"
                            >✕</button>
                        </div>
                    } @empty {
                        <p class="opacity-60 px-1">NENHUMA VIEW DESENHADA.</p>
                    }
                </pip-list>
            </pip-accordion>

            <pip-accordion [(open)]="effectsOpen" class="py-2 px-3 border-b border-white text-xs">
                <p accordionTitle class="opacity-60 font-black">EFEITOS</p>
                <span class="opacity-60">Cumulativos — pode ligar vários ao mesmo tempo.</span>
                @for (effectType of effectTypes; track effectType.value) {
                    <label class="flex flex-row items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            [checked]="map.effects().includes(effectType.value)"
                            (change)="map.toggleEffect(effectType.value)"
                        />
                        <span class="opacity-80">{{ effectType.label }}</span>
                    </label>
                }
            </pip-accordion>

            <pip-accordion [(open)]="objectsOpen" class="py-2 px-3 text-xs">
                <p accordionTitle class="opacity-60 font-black">OBJETOS</p>
                <button
                    type="button"
                    class="self-start px-2 py-0.5 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                    (click)="map.addObject()"
                >+ NOVO</button>
                <div class="flex flex-row items-center gap-1">
                    <input
                        class="field flex-1 min-w-0 py-0.5!"
                        type="search"
                        placeholder="FILTRAR (nome, tipo, 28x22, oculto)"
                        [value]="objectFilter()"
                        (input)="objectFilter.set($any($event.target).value)"
                    />
                    <span class="shrink-0 opacity-60">{{ filteredObjects().length }}/{{ map.objects().length }}</span>
                </div>
                <pip-list class="flex flex-col gap-1 w-full p-0!">
                    @for (object of filteredObjects(); track object.id) {
                        <pip-list-item
                            [isActive]="map.isSelected(object.id)"
                            class="flex flex-row items-center gap-2"
                            [class.opacity-50]="object.hidden"
                            (onClick)="map.selectObject(object.id)"
                            (contextmenu)="onRowContextMenu($event, object.id)"
                        >
                            <span class="w-3 h-3 shrink-0 border border-white/60" [class]="typeColors[object.type]"></span>
                            <span class="flex-1 truncate">{{ object.label || typeLabels[object.type] }}</span>
                            <button
                                type="button"
                                class="px-1 border cursor-pointer"
                                [class]="object.hidden
                                    ? 'border-amber-400/60 text-amber-300 hover:bg-amber-400 hover:text-black'
                                    : 'border-white/40 hover:bg-white hover:text-black'"
                                [title]="object.hidden ? 'Oculto pros jogadores — clique pra mostrar' : 'Visível pros jogadores — clique pra ocultar'"
                                (click)="$event.stopPropagation(); map.toggleHidden(object.id)"
                            ><i class="fa-solid" [class.fa-eye]="!object.hidden" [class.fa-eye-slash]="object.hidden"></i></button>
                            <button
                                type="button"
                                class="px-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                                (click)="$event.stopPropagation(); map.removeObject(object.id)"
                            >✕</button>
                        </pip-list-item>
                    } @empty {
                        <p class="opacity-60 px-1">{{ map.objects().length ? 'NENHUM OBJETO CASA COM O FILTRO.' : 'NENHUM OBJETO NO CENÁRIO.' }}</p>
                    }
                </pip-list>
            </pip-accordion>
        </div>
    }
    `,
    styles: `
    .field {
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus { outline: 2px solid white; }
    `,
    host: { class: 'block' },
    imports: [OutlineDirective, TitleDirective, CardComponent, ListComponent, ListItemComponent, AccordionComponent],
})
export class MapMasterPanelComponent {
    protected readonly admin = inject(AdminService);
    protected readonly map = inject(MapService);
    protected readonly typeLabels = TYPE_LABELS;
    protected readonly typeColors = MAP_OBJECT_TYPE_COLORS;
    protected readonly effectTypes = MAP_EFFECT_TYPES;

    protected readonly infosOpen = signal(true);
    protected readonly lightingOpen = signal(true);
    protected readonly viewsOpen = signal(true);
    protected readonly effectsOpen = signal(true);
    protected readonly objectsOpen = signal(true);

    protected readonly objectFilter = signal('');
    protected readonly filteredObjects = computed(() =>
        this.map.objects().filter(object => objectMatchesFilter(object, this.objectFilter()))
    );

    protected onBackgroundImage(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.map.setBackgroundImage(file);
    }

    protected onImportFile(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.map.importFromJson(file);
    }

    protected onRowContextMenu(event: MouseEvent, objectId: string): void {
        event.preventDefault();
        if (!this.map.isSelected(objectId)) this.map.selectObject(objectId);
        this.map.contextMenu.set({ objectId, x: event.clientX, y: event.clientY });
    }
}
