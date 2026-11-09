import { Component, HostListener, computed, inject, input } from "@angular/core";
import { PanZoomViewportComponent } from "@shared/components/pan-zoom-viewport/pan-zoom-viewport.component";
import { MAP_OBJECT_TYPE_COLORS, MapObject } from "@shared/models/game-map";
import { AdminService } from "@shared/services/admin.service";
import { ArmaSelecionadaUsuarioService } from "@shared/services/arma-selecionada-usuario.service";
import { ItemsService } from "@shared/services/items.service";
import { MapService } from "@shared/services/map.service";
import { PlayersService } from "@shared/services/players.service";
import { TurnService } from "@shared/services/turn.service";
import { weaponPatternCells } from "./weapon-patterns";

const TILE = 16;

interface Drag {
    pointerId: number;
    clientX: number;
    clientY: number;
    /** Posição inicial de TODOS os objetos selecionados — arrastar um arrasta o grupo inteiro junto. */
    startPositions: Map<string, { x: number; y: number }>;
    /** Último deslocamento enviado, em tiles — só manda comando quando muda de tile. */
    dx: number;
    dy: number;
    /** Jogador arrastando o próprio token (id do personagem) — senão é o Mestre arrastando a seleção. */
    ownPlayerId?: string;
}

interface HpInfo {
    hp: number;
    maxHp: number;
    stars: number;
    level: number | null;
}

/**
 * Um objeto no grid — quadrado de 1 tile. Clique+arrastar move (só Mestre,
 * snapado na célula); botão direito abre o editor (`MapService.contextMenu`).
 * A label é "descontra-escalada" (`labelTransform`) pra ficar legível em
 * qualquer zoom, já que o zoom varia de 10% a 800%.
 *
 * Objetos do tipo "player" (`object.playerId`) espelham HP/cor do `Player`
 * de verdade (`PlayersService`) em vez de ter os próprios campos, e — se
 * `showWeaponRange` estiver ligado — pintam o alcance da arma que esse
 * jogador tem EQUIPADA de verdade (`ArmaSelecionadaUsuarioService` → item do
 * catálogo → `weaponType`/`range`), não um tipo escolhido manualmente aqui.
 */
@Component({
    selector: 'pip-map-object',
    template: `
    @for (cell of weaponCells(); track cell.dx + '_' + cell.dy) {
        <div
            class="absolute pointer-events-none"
            [style.left.px]="(object().x + cell.dx) * tile"
            [style.top.px]="(object().y + cell.dy) * tile"
            [style.width.px]="tile"
            [style.height.px]="tile"
            [style.background-color]="weaponColor()"
            style="opacity: 0.3"
        ></div>
    }
    <div
        class="absolute flex items-start justify-center"
        [style.left.px]="object().x * tile"
        [style.top.px]="object().y * tile"
        [style.width.px]="tile"
        [style.height.px]="tile"
        [style.background-image]="object().backgroundImage ? 'url(' + object().backgroundImage + ')' : null"
        [style.border-color]="borderColor()"
        [class]="squareClasses()"
        style="image-rendering: pixelated"
        (pointerdown)="onPointerDown($event)"
        (contextmenu)="onContextMenu($event)"
    >
        @if (hpInfo(); as info) {
            <div
                class="absolute bottom-full mb-0.5 flex flex-col items-center gap-0.5 pointer-events-none"
                [style.transform]="labelTransform()"
                style="transform-origin: bottom center"
            >
                @if (starsText()) {
                    <span class="text-[8px] leading-none text-yellow-300 whitespace-nowrap" style="text-shadow: 0 0 2px black, 0 0 2px black">
                        {{ starsText() }}
                    </span>
                }
                @if (hpInfo()?.level; as level) {
                    <span class="text-[8px] leading-none text-cyan-300 whitespace-nowrap" style="text-shadow: 0 0 2px black, 0 0 2px black">
                        LV {{ level }}
                    </span>
                }
                <div class="w-6 h-1 bg-black/70 border border-white/50">
                    <div class="h-full" [class]="hpBarColor()" [style.width.%]="hpPercent()"></div>
                </div>
            </div>
        }
        @if (object().hidden) {
            <!-- Só o Mestre chega aqui (jogadores nem recebem o objeto em visibleObjects). -->
            <i
                class="fa-solid fa-eye-slash absolute -top-1 -right-1 text-[6px] leading-none text-amber-300 pointer-events-none"
                style="text-shadow: 0 0 2px black, 0 0 2px black"
                title="Oculto pros jogadores"
            ></i>
        }
        @if (object().label) {
            <span
                class="absolute top-full mt-0.5 whitespace-nowrap text-[8px] leading-none bg-black/85 text-white px-1 border border-white/40 pointer-events-none"
                [class.opacity-60]="object().hidden"
                [style.transform]="labelTransform()"
                style="transform-origin: top center"
            >{{ object().hidden ? '(oculto) ' : '' }}{{ object().label }}</span>
        }
    </div>
    `,
    host: { class: 'contents' },
})
export class MapObjectComponent {
    protected readonly admin = inject(AdminService);
    private readonly map = inject(MapService);
    private readonly players = inject(PlayersService);
    private readonly armaSelecionada = inject(ArmaSelecionadaUsuarioService);
    private readonly items = inject(ItemsService);
    private readonly viewport = inject(PanZoomViewportComponent);
    private readonly turn = inject(TurnService);

    readonly object = input.required<MapObject>();
    protected readonly tile = TILE;

    private drag: Drag | null = null;

    protected readonly labelTransform = computed(() => `scale(${1 / this.viewport.scale()})`);

    /** Player de verdade (PlayersService) vinculado a este objeto, se houver. */
    protected readonly linkedPlayer = computed(() => {
        const object = this.object();
        if (object.type !== 'player' || !object.playerId) return null;
        return this.players.players().find(p => p.id === object.playerId) ?? null;
    });

    protected readonly hpInfo = computed<HpInfo | null>(() => {
        const object = this.object();
        if (object.type === 'enemy' && object.maxHp) {
            return { hp: object.hp ?? 0, maxHp: object.maxHp, stars: object.difficultyStars ?? 0, level: null };
        }
        const player = this.linkedPlayer();
        if (object.type === 'player' && player) {
            return { hp: player.hp, maxHp: player.maxHp, stars: 0, level: player.level };
        }
        return null;
    });

    protected readonly hpPercent = computed(() => {
        const info = this.hpInfo();
        if (!info || info.maxHp <= 0) return 0;
        return Math.max(0, Math.min(100, (info.hp / info.maxHp) * 100));
    });

    protected readonly hpBarColor = computed(() => {
        const percent = this.hpPercent();
        return percent > 60 ? 'bg-green-500' : percent > 30 ? 'bg-yellow-400' : 'bg-red-500';
    });

    protected readonly starsText = computed(() => '★'.repeat(this.hpInfo()?.stars ?? 0));

    /** Arma que o player vinculado tem equipada agora de verdade (INV > WEAPONS), se houver. */
    protected readonly equippedWeapon = computed(() => {
        const player = this.linkedPlayer();
        if (!player) return null;
        const itemId = this.armaSelecionada.armaDoUsuario(player.id);
        return itemId ? this.items.find(itemId) ?? null : null;
    });

    /** Células do alcance da arma, só quando é um player com a opção ligada e uma arma equipada. */
    protected readonly weaponCells = computed(() => {
        const object = this.object();
        if (object.type !== 'player' || !object.showWeaponRange) return [];
        const weapon = this.equippedWeapon();
        if (!weapon?.range) return [];
        return weaponPatternCells(weapon.weaponType ?? 'pistol', weapon.range);
    });

    protected readonly weaponColor = computed(() => this.linkedPlayer()?.color ?? '#ffffff');

    protected readonly borderColor = computed(() => {
        const object = this.object();
        if (object.type === 'player') return this.linkedPlayer()?.color ?? '#ffffff';
        return '#ffffff';
    });

    /** Jogador pode arrastar este objeto: é o token do PRÓPRIO personagem e ele pode agir agora (turno). */
    private readonly canDragOwn = computed(() => {
        if (this.admin.isAdmin()) return false;
        // `canAct` já confere que o personagem é do usuário logado (e o turno).
        return this.turn.canAct(this.linkedPlayer());
    });

    protected readonly squareClasses = computed(() => {
        const object = this.object();
        const border = object.border === 'none' ? '' : object.border === 'dashed' ? 'border border-dashed' : 'border border-solid';
        const fill = object.backgroundImage ? 'bg-cover bg-center' : MAP_OBJECT_TYPE_COLORS[object.type];
        const selected = this.map.isSelected(object.id) ? 'outline outline-2 outline-white outline-offset-1' : '';
        const cursor = this.admin.isAdmin() || this.canDragOwn() ? (this.drag ? 'cursor-grabbing' : 'cursor-grab') : '';
        const hidden = !object.hidden ? '' : selected ? 'opacity-40' : 'opacity-40 outline-dashed outline-1 outline-amber-300';
        return `${border} ${fill} ${selected} ${cursor} ${hidden}`;
    });

    protected onPointerDown(event: PointerEvent): void {
        if (event.button !== 0) return;
        const object = this.object();

        if (!this.admin.isAdmin()) {
            const player = this.linkedPlayer();
            if (!player || !this.canDragOwn()) return;
            event.stopPropagation();
            const startPositions = new Map([[object.id, { x: object.x, y: object.y }]]);
            this.drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, startPositions, dx: 0, dy: 0, ownPlayerId: player.id };
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            return;
        }

        event.stopPropagation();

        if (event.shiftKey) {
            // Shift+clique só soma/tira da seleção — não arrasta (bate com o
            // Shift+arrastar do viewport, que desenha o retângulo de seleção).
            this.map.selectObject(object.id, { additive: true });
            return;
        }

        if (!this.map.isSelected(object.id)) this.map.selectObject(object.id);
        // Se já fazia parte de uma seleção múltipla, mantém o grupo — arrastar
        // qualquer um dos selecionados move todo mundo junto.

        const startPositions = new Map(
            this.map.selectedObjectIds().map(id => {
                const o = this.map.objects().find(o => o.id === id);
                return [id, { x: o?.x ?? 0, y: o?.y ?? 0 }] as const;
            }),
        );
        this.drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, startPositions, dx: 0, dy: 0 };
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }

    @HostListener('pointermove', ['$event'])
    protected onPointerMove(event: PointerEvent): void {
        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        const scale = this.viewport.scale();
        const dx = Math.round((event.clientX - this.drag.clientX) / scale / TILE);
        const dy = Math.round((event.clientY - this.drag.clientY) / scale / TILE);
        if (dx === this.drag.dx && dy === this.drag.dy) return;
        this.drag.dx = dx;
        this.drag.dy = dy;
        const moves = [...this.drag.startPositions].map(([id, start]) => ({ id, x: start.x + dx, y: start.y + dy }));
        if (this.drag.ownPlayerId) {
            this.map.dragOwnTo(this.drag.ownPlayerId, moves[0].id, moves[0].x, moves[0].y);
            return;
        }
        // Uma prévia local + um comando só pro grupo inteiro (ver `MapService.dragTo`).
        this.map.dragTo(moves);
    }

    @HostListener('pointerup', ['$event'])
    @HostListener('pointercancel', ['$event'])
    protected onPointerUp(event: PointerEvent): void {
        if (!this.drag || this.drag.pointerId !== event.pointerId) return;
        this.drag = null;
        this.map.endDrag();
    }

    protected onContextMenu(event: MouseEvent): void {
        if (!this.admin.isAdmin()) return;
        event.preventDefault();
        event.stopPropagation();
        const object = this.object();
        if (!this.map.isSelected(object.id)) this.map.selectObject(object.id);
        this.map.contextMenu.set({ objectId: object.id, x: event.clientX, y: event.clientY });
    }
}
