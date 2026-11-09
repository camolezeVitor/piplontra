import { Component, ElementRef, HostListener, OnDestroy, computed, inject, signal } from "@angular/core";
import { AvailableAudios, AudioService } from "@shared/components/audio/audio.service";
import { LIGHT_KINDS, MAP_OBJECT_BORDERS, MAP_OBJECT_TYPES, MapObject, MapObjectType } from "@shared/models/game-map";
import { ITEM_CATEGORIES, Item, ItemCategory } from "@shared/models/item";
import { Player } from "@shared/models/player";
import { ArmaSelecionadaUsuarioService } from "@shared/services/arma-selecionada-usuario.service";
import { BloodEffectService } from "@shared/services/blood-effect.service";
import { GeneratedLootEntry } from "@shared/services/loot-generator.service";
import { ItemsService } from "@shared/services/items.service";
import { MapService } from "@shared/services/map.service";
import { PlayersService } from "@shared/services/players.service";
import { LootGeneratorPanelComponent } from "../loot/loot-generator-panel.component";

const MENU_WIDTH = 280;
const MENU_HEIGHT = 440;

const ILLUMINATION_DEFAULTS: Partial<MapObject> = {
    lightKind: 'point',
    lightRadius: 4,
    lightAngle: 0,
    lightSpread: 60,
};

const ENEMY_DEFAULTS: Partial<MapObject> = {
    hp: 10,
    maxHp: 10,
    difficultyStars: 0,
    loot: [],
};

const PLAYER_DEFAULTS: Partial<MapObject> = {
    showWeaponRange: false,
};

const STAR_RANGE = [1, 2, 3, 4, 5];

/**
 * Editor de objeto em forma de menu de contexto, aberto pelo botão direito
 * (no grid ou na lista lateral). Move-se pro `<body>`, igual `ModalComponent`,
 * pra escapar do filtro de cor do app e da transform de zoom/pan do mapa —
 * senão o menu renderizaria escalado junto com o mundo.
 */
@Component({
    selector: 'pip-map-object-context-menu',
    template: `
    @if (target(); as object) {
        <div
            class="fixed z-200 bg-black border border-white p-3 flex flex-col gap-2 text-xs w-70 h-110 overflow-y-auto overscroll-contain"
            [style.left.px]="left()"
            [style.top.px]="top()"
            (contextmenu)="$event.preventDefault()"
        >
            <label class="flex flex-col gap-1">
                <span class="opacity-80">LABEL</span>
                <input class="field" type="text" [value]="object.label" (input)="patch({ label: $any($event.target).value })" />
            </label>

            <label class="flex flex-col gap-1">
                <span class="opacity-80">TIPO</span>
                <select class="field" [value]="object.type" (change)="onTypeChange($any($event.target).value)">
                    @for (t of types; track t.value) {
                        <option [value]="t.value">{{ t.label }}</option>
                    }
                </select>
            </label>

            @if (object.type === 'illumination') {
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">TIPO DE LUZ</span>
                    <select class="field" [value]="object.lightKind ?? 'point'" (change)="patch({ lightKind: $any($event.target).value })">
                        @for (k of lightKinds; track k.value) {
                            <option [value]="k.value">{{ k.label }}</option>
                        }
                    </select>
                </label>
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">ALCANCE (TILES)</span>
                    <input class="field" type="number" min="1" max="60" [value]="object.lightRadius ?? 4" (input)="patch({ lightRadius: number($event) })" />
                </label>
                @if (object.lightKind === 'cone') {
                    <label class="flex flex-col gap-1">
                        <span class="opacity-80">DIREÇÃO (°, 0 = direita)</span>
                        <input class="field" type="number" min="0" max="359" [value]="object.lightAngle ?? 0" (input)="patch({ lightAngle: number($event) })" />
                    </label>
                    <label class="flex flex-col gap-1">
                        <span class="opacity-80">ABERTURA (°)</span>
                        <input class="field" type="number" min="5" max="180" [value]="object.lightSpread ?? 60" (input)="patch({ lightSpread: number($event) })" />
                    </label>
                }
            }

            @if (object.type === 'enemy') {
                <div class="flex flex-row gap-2">
                    <label class="flex flex-col gap-1 flex-1">
                        <span class="opacity-80">HP ATUAL</span>
                        <input class="field" type="number" min="0" [value]="object.hp ?? 0" (input)="patch({ hp: clampHp(number($event), object.maxHp ?? 10) })" />
                    </label>
                    <label class="flex flex-col gap-1 flex-1">
                        <span class="opacity-80">HP MÁXIMO</span>
                        <input class="field" type="number" min="1" [value]="object.maxHp ?? 10" (input)="onMaxHpChange($event)" />
                    </label>
                </div>

                <label class="flex flex-col gap-1">
                    <span class="opacity-80">DIFICULDADE (OPCIONAL)</span>
                    <div class="flex flex-row gap-1">
                        @for (star of starRange; track star) {
                            <button
                                type="button"
                                class="text-base leading-none cursor-pointer"
                                [class.opacity-100]="star <= (object.difficultyStars ?? 0)"
                                [class.opacity-25]="star > (object.difficultyStars ?? 0)"
                                (click)="toggleStar(object, star)"
                                title="{{ star }} estrela(s) — clique de novo na mesma pra remover"
                            >★</button>
                        }
                    </div>
                </label>

                <div class="flex flex-row gap-2 items-end">
                    <label class="flex flex-col gap-1 flex-1">
                        <span class="opacity-80">DANO</span>
                        <input class="field" type="number" min="1" [value]="damageAmount()" (input)="damageAmount.set(number($event))" />
                    </label>
                    <button
                        type="button"
                        class="px-2 py-1.5 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                        (click)="applyDamage(object.id)"
                    >APLICAR DANO</button>
                </div>

                <div class="flex flex-col gap-1 pt-1 border-t border-white/20">
                    <span class="opacity-80">LOOT (AO MORRER)</span>
                    <select class="field" [value]="lootCategory()" (change)="onLootCategoryChange($any($event.target).value)">
                        @for (c of categories; track c.value) {
                            <option [value]="c.value">{{ c.label }}</option>
                        }
                    </select>
                    <div class="flex flex-row gap-1">
                        <select class="field flex-1 min-w-0" [value]="lootItemId()" (change)="lootItemId.set($any($event.target).value)">
                            @for (item of lootCategoryItems(); track item.id) {
                                <option [value]="item.id">{{ item.label }}</option>
                            }
                        </select>
                        <input class="field w-12" type="number" min="1" [value]="lootQuantity()" (input)="lootQuantity.set(number($event))" />
                        <button type="button" class="px-2 border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addLoot(object)">+</button>
                    </div>
                    <div class="flex flex-col gap-1 max-h-24 overflow-auto">
                        @for (entry of object.loot ?? []; track entry.itemId) {
                            <div class="flex flex-row items-center gap-1">
                                <span class="flex-1 truncate">{{ itemLabel(entry.itemId) }} x{{ entry.quantity }}</span>
                                <button
                                    type="button"
                                    class="px-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                                    (click)="removeLoot(object, entry.itemId)"
                                >✕</button>
                            </div>
                        } @empty {
                            <span class="opacity-50">SEM LOOT ATRIBUÍDO.</span>
                        }
                    </div>
                    <pip-loot-generator-panel (generated)="onGenerated(object, $event)" />
                </div>
            }

            @if (object.type === 'player') {
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">JOGADOR VINCULADO</span>
                    <select class="field" [value]="object.playerId ?? ''" (change)="onPlayerLinkChange($any($event.target).value)">
                        <option value="">— NENHUM —</option>
                        @for (p of players.players(); track p.id) {
                            <option [value]="p.id">{{ p.label }}</option>
                        }
                    </select>
                </label>

                @if (linkedPlayer(object); as player) {
                    <div class="flex flex-col gap-1 p-2 border border-white/20">
                        <span class="opacity-60">EDITAR JOGADOR VINCULADO</span>
                        <div class="flex flex-row gap-1">
                            <input type="color" class="w-8 h-8 p-0 shrink-0 bg-transparent border border-white/40 cursor-pointer" [value]="player.color" (input)="patchPlayer(player.id, { color: $any($event.target).value })" />
                            <input class="field flex-1" type="text" placeholder="NOME" [value]="player.label" (change)="patchPlayer(player.id, { label: $any($event.target).value })" />
                        </div>
                        <label class="flex flex-col gap-1 cursor-pointer" title="Retrato do jogador">
                            @if (player.image; as img) {
                                <img [src]="img" alt="" class="w-full h-16 object-cover border border-white" style="image-rendering: pixelated" />
                            } @else {
                                <span class="w-full h-10 flex items-center justify-center border border-dashed border-white/60 text-[10px]">SEM RETRATO</span>
                            }
                            <input type="file" accept="image/*" class="hidden" (change)="onPlayerImage(player.id, $event)" />
                        </label>
                        @if (player.image) {
                            <button type="button" class="self-start underline opacity-80 hover:opacity-100 cursor-pointer" (click)="useImageOnObject(player)">
                                USAR RETRATO NO OBJETO
                            </button>
                        }

                        <div class="flex flex-row items-center gap-1 pt-1 border-t border-white/20">
                            <span class="opacity-80 w-16">DANO</span>
                            <input #hpSpend class="field w-14" type="number" min="1" value="10" />
                            <button type="button" class="flex-1 px-1.5 py-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="spendHp(player.id, hpSpend.valueAsNumber)">APLICAR DANO</button>
                        </div>
                        <div class="flex flex-row items-center gap-1">
                            <span class="opacity-80 w-16">AP</span>
                            <input #apSpend class="field w-14" type="number" min="1" value="10" />
                            <button type="button" class="flex-1 px-1.5 py-1 border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black" (click)="spendAp(player.id, apSpend.valueAsNumber)">GASTAR</button>
                        </div>
                        <div class="flex flex-row items-center gap-1">
                            <span class="opacity-80 w-16">RADIAÇÃO</span>
                            <input #radsSpend class="field w-14" type="number" min="1" value="10" />
                            <button type="button" class="flex-1 px-1.5 py-1 border border-amber-400/60 text-amber-300 cursor-pointer hover:bg-amber-400 hover:text-black" (click)="spendRads(player.id, radsSpend.valueAsNumber)">GASTAR</button>
                        </div>
                    </div>
                }

                <label class="flex flex-row items-center gap-2 cursor-pointer">
                    <input type="checkbox" [checked]="object.showWeaponRange ?? false" (change)="patch({ showWeaponRange: $any($event.target).checked })" />
                    <span class="opacity-80">MOSTRAR ALCANCE DA ARMA</span>
                </label>

                @if (object.showWeaponRange) {
                    <p class="opacity-60">
                        @if (equippedWeapon(object); as weapon) {
                            ARMA EQUIPADA: {{ weapon.label }} (ALCANCE {{ weapon.range ?? '?' }})
                        } @else {
                            NENHUMA ARMA EQUIPADA EM INV &gt; WEAPONS PRO JOGADOR VINCULADO.
                        }
                    </p>
                }

                @if (equippedWeapon(object); as weapon) {
                    <button
                        type="button"
                        class="px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                        (click)="useWeapon(object)"
                    >USAR ARMA ({{ weapon.label }})</button>
                }
            }

            <label class="flex flex-col gap-1 cursor-pointer" title="Imagem de fundo do objeto">
                <span class="opacity-80">FUNDO (OPCIONAL)</span>
                @if (object.backgroundImage; as bg) {
                    <img [src]="bg" alt="" class="w-full h-12 object-cover border border-white" style="image-rendering: pixelated" />
                } @else {
                    <span class="w-full h-12 flex items-center justify-center border border-dashed border-white/60">SEM IMAGEM</span>
                }
                <input type="file" accept="image/*" class="hidden" (change)="onImage($event)" />
            </label>
            @if (object.backgroundImage) {
                <button type="button" class="self-start underline opacity-80 hover:opacity-100 cursor-pointer" (click)="patch({ backgroundImage: null })">
                    REMOVER IMAGEM
                </button>
            }

            <label class="flex flex-col gap-1">
                <span class="opacity-80">BORDA</span>
                <select class="field" [value]="object.border" (change)="patch({ border: $any($event.target).value })">
                    @for (b of borders; track b.value) {
                        <option [value]="b.value">{{ b.label }}</option>
                    }
                </select>
            </label>

            <button
                type="button"
                class="mt-1 px-2 py-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                (click)="remove()"
            >REMOVER OBJETO</button>
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
    imports: [LootGeneratorPanelComponent],
})
export class MapObjectContextMenuComponent implements OnDestroy {
    protected readonly map = inject(MapService);
    protected readonly players = inject(PlayersService);
    private readonly itemsService = inject(ItemsService);
    private readonly armaSelecionada = inject(ArmaSelecionadaUsuarioService);
    private readonly audio = inject(AudioService);
    private readonly bloodEffect = inject(BloodEffectService);

    protected readonly types = MAP_OBJECT_TYPES;
    protected readonly borders = MAP_OBJECT_BORDERS;
    protected readonly lightKinds = LIGHT_KINDS;
    protected readonly categories = ITEM_CATEGORIES;
    protected readonly starRange = STAR_RANGE;

    protected readonly damageAmount = signal(5);
    protected readonly lootCategory = signal<ItemCategory>('weapon');
    protected readonly lootItemId = signal(this.itemsService.byCategory('weapon')[0]?.id ?? '');
    protected readonly lootQuantity = signal(1);

    protected readonly lootCategoryItems = computed(() => this.itemsService.byCategory(this.lootCategory()));

    protected readonly target = computed<MapObject | null>(() => {
        const menu = this.map.contextMenu();
        if (!menu) return null;
        return this.map.objects().find(o => o.id === menu.objectId) ?? null;
    });

    protected readonly left = computed(() => {
        const menu = this.map.contextMenu();
        return menu ? Math.max(8, Math.min(menu.x, window.innerWidth - MENU_WIDTH - 8)) : 0;
    });
    protected readonly top = computed(() => {
        const menu = this.map.contextMenu();
        return menu ? Math.max(8, Math.min(menu.y, window.innerHeight - MENU_HEIGHT - 8)) : 0;
    });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    constructor() {
        document.body.appendChild(this.host);
    }

    ngOnDestroy(): void {
        this.host.remove();
    }

    @HostListener('document:pointerdown', ['$event'])
    protected onDocumentPointerDown(event: PointerEvent): void {
        if (this.map.contextMenu() && !this.host.contains(event.target as Node)) this.close();
    }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        this.close();
    }

    protected patch(change: Partial<MapObject>): void {
        const menu = this.map.contextMenu();
        if (menu) this.map.updateObject(menu.objectId, change);
    }

    /** Ao virar "iluminação"/"inimigo"/"player" pela primeira vez, já entra com valores padrão pra ter o que editar. */
    protected onTypeChange(value: MapObjectType): void {
        const current = this.target();
        if (value === 'illumination' && !current?.lightKind) {
            this.patch({ type: value, ...ILLUMINATION_DEFAULTS });
        } else if (value === 'enemy' && current?.maxHp === undefined) {
            this.patch({ type: value, ...ENEMY_DEFAULTS });
        } else if (value === 'player' && current?.showWeaponRange === undefined) {
            const playerId = this.players.selected()?.id ?? this.players.players()[0]?.id;
            this.patch({ type: value, ...PLAYER_DEFAULTS, playerId });
        } else {
            this.patch({ type: value });
        }
    }

    protected number(event: Event): number {
        const raw = Number((event.target as HTMLInputElement).value);
        return Number.isFinite(raw) ? raw : 0;
    }

    protected clampHp(value: number, maxHp: number): number {
        return Math.max(0, Math.min(value, maxHp));
    }

    protected onMaxHpChange(event: Event): void {
        const maxHp = Math.max(1, this.number(event));
        const hp = Math.min(this.target()?.hp ?? maxHp, maxHp);
        this.patch({ maxHp, hp });
    }

    protected toggleStar(object: MapObject, star: number): void {
        this.patch({ difficultyStars: (object.difficultyStars ?? 0) === star ? 0 : star });
    }

    protected applyDamage(id: string): void {
        const menu = this.map.contextMenu();
        this.map.damageObject(id, this.damageAmount());
        if (menu) {
            this.audio.playInstantAudio(AvailableAudios.PipboyDamage);
            this.bloodEffect.burst(menu.x, menu.y);
        }
    }

    protected onLootCategoryChange(category: ItemCategory): void {
        this.lootCategory.set(category);
        this.lootItemId.set(this.itemsService.byCategory(category)[0]?.id ?? '');
    }

    protected itemLabel(id: string): string {
        return this.itemsService.find(id)?.label ?? '???';
    }

    /** Arma equipada de verdade (INV > WEAPONS) pelo jogador vinculado a este objeto. */
    protected equippedWeapon(object: MapObject): Item | null {
        if (!object.playerId) return null;
        const itemId = this.armaSelecionada.armaDoUsuario(object.playerId);
        return itemId ? this.itemsService.find(itemId) ?? null : null;
    }

    /** Player de verdade (`PlayersService`) vinculado ao objeto, se houver. */
    protected linkedPlayer(object: MapObject): Player | null {
        if (!object.playerId) return null;
        return this.players.players().find(p => p.id === object.playerId) ?? null;
    }

    /** Ao trocar o jogador vinculado, já atribui o retrato dele ao objeto automaticamente (se ele tiver um). */
    protected onPlayerLinkChange(playerId: string): void {
        const player = playerId ? this.players.players().find(p => p.id === playerId) : null;
        this.patch({
            playerId: playerId || undefined,
            ...(player?.image ? { backgroundImage: player.image } : {}),
        });
    }

    protected patchPlayer(playerId: string, change: Partial<Player>): void {
        this.players.updatePlayer(playerId, change);
    }

    protected onPlayerImage(playerId: string, event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.players.setPlayerImage(playerId, file);
    }

    /** Copia o retrato atual do jogador pra imagem de fundo do objeto (pode já estar desatualizado se o retrato mudou depois do vínculo). */
    protected useImageOnObject(player: Player): void {
        if (player.image) this.patch({ backgroundImage: player.image });
    }

    /** Mesmo tratamento do "APLICAR DANO" de inimigo: áudio + respingo de sangue na posição do menu. */
    protected spendHp(playerId: string, amount: number): void {
        if (!Number.isFinite(amount) || amount <= 0) return;
        this.players.damagePlayer(playerId, amount);
        const menu = this.map.contextMenu();
        if (menu) {
            this.audio.playInstantAudio(AvailableAudios.PipboyDamage);
            this.bloodEffect.burst(menu.x, menu.y);
        }
    }

    protected spendAp(playerId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.players.spendAp(playerId, amount);
    }

    protected spendRads(playerId: string, amount: number): void {
        if (Number.isFinite(amount) && amount > 0) this.players.adjustRads(playerId, amount);
    }

    /** Dispara a arma equipada: gasta 1 bala (se a munição for rastreada) e avisa com áudio quando não há mais. */
    protected async useWeapon(object: MapObject): Promise<void> {
        if (!object.playerId || !this.equippedWeapon(object)) return;
        const result = await this.players.useWeapon(object.playerId).catch(() => 'no-ammo' as const);
        if (result === 'no-ammo') this.audio.playInstantAudio(AvailableAudios.PipboyError);
    }

    protected addLoot(object: MapObject): void {
        const itemId = this.lootItemId() || this.lootCategoryItems()[0]?.id;
        if (!itemId) return;
        const quantity = Math.max(1, this.lootQuantity());
        const existing = object.loot ?? [];
        const found = existing.find(e => e.itemId === itemId);
        const loot = found
            ? existing.map(e => e.itemId === itemId ? { ...e, quantity: e.quantity + quantity } : e)
            : [...existing, { itemId, quantity }];
        this.patch({ loot });
    }

    protected removeLoot(object: MapObject, itemId: string): void {
        this.patch({ loot: (object.loot ?? []).filter(e => e.itemId !== itemId) });
    }

    protected onGenerated(object: MapObject, entries: GeneratedLootEntry[]): void {
        let loot = object.loot ?? [];
        for (const { itemId, quantity } of entries) {
            const found = loot.find(e => e.itemId === itemId);
            loot = found
                ? loot.map(e => e.itemId === itemId ? { ...e, quantity: e.quantity + quantity } : e)
                : [...loot, { itemId, quantity }];
        }
        this.patch({ loot });
    }

    protected onImage(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        const menu = this.map.contextMenu();
        if (file && menu) this.map.setObjectBackgroundImage(menu.objectId, file);
    }

    protected remove(): void {
        const menu = this.map.contextMenu();
        if (menu) this.map.removeObject(menu.objectId);
    }

    private close(): void {
        this.map.contextMenu.set(null);
    }
}
