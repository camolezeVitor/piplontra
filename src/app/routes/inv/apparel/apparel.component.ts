import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { CardComponent } from "@shared/components/card/card.component";
import { APPAREL_SLOTS, Item } from "@shared/models/item";
import { ItemsService } from "@shared/services/items.service";
import { AdminService } from "@shared/services/admin.service";
import { PlayersService } from "@shared/services/players.service";
import { TurnService } from "@shared/services/turn.service";
import { RoupaSelecionadaUsuarioService } from "@shared/services/roupa-selecionada-usuario.service";
import { AddItemDialogComponent } from "../../../features/admin/add-item-dialog/add-item-dialog.component";
import { RemoveItemButtonsComponent } from "../../../features/admin/remove-item-buttons.component";

@Component({
    selector: "pip-apparel",
    template: `
    <div class="flex flex-row h-full py-6 overflow-auto">
        <div class="flex flex-col gap-1 w-2/5! overflow-auto">
            @if (admin.isAdmin()) {
                <button type="button" class="self-end w-full px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addOpen.set(true)">+</button>
            }
            <pip-list class="flex flex-col gap-1 w-full overflow-auto">
                @for (item of elements(); track item.id) {
                    <pip-list-item [isActive]="isSelected(item)" class="flex flex-row justify-between items-center gap-2" (onClick)="select(item)">
                        <span class="truncate">{{ item.label }} ({{ count(item) }})</span>
                        <span class="shrink-0 flex items-center gap-1">
                            <span class="text-[10px] opacity-60">{{ slotLabel(item) }}</span>
                            @if (isEquipada(item)) {
                                <span class="text-xs bg-white text-black px-1">EQUIPADA</span>
                            }
                        </span>
                    </pip-list-item>
                } @empty {
                    <p class="opacity-60 p-2 text-xs">NENHUMA ROUPA NO INVENTÁRIO.</p>
                }
            </pip-list>
        </div>

        <section class="w-3/5 px-6 flex flex-col gap-6">
            @if (selected(); as item) {
                <div class="flex justify-center">
                    <i class="text-white/80 fa-solid fa-shirt text-7xl pixelize"></i>
                </div>

                <div class="w-full flex flex-col gap-1">
                    <div class="w-full flex flex-row gap-1">
                        <pip-card class="px-2! py-1! w-full">DMG Resist</pip-card>
                        <pip-card class="px-2! py-1! w-fit flex flex-row gap-2 items-center flex-nowrap">
                            <i class="fa-solid fa-shield-halved"></i>
                            <span>{{item.dr}}</span>
                        </pip-card>
                    </div>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Energy Resist</span>
                        <span>{{item.er}}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Rad Resist</span>
                        <span>{{item.rr}}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Weight</span>
                        <span>{{item.weight}}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Value</span>
                        <span>{{item.value}}</span>
                    </pip-card>
                    @if (admin.isAdmin() && count(item) > 0) {
                        <button
                            type="button"
                            class="px-2 py-1 text-xs border border-amber-400/60 text-amber-300 cursor-pointer hover:bg-amber-400 hover:text-black"
                            (click)="sell(item)"
                        >VENDER 1 (+{{ item.value }})</button>
                    }
                    @if (admin.isAdmin() && count(item) > 0) {
                        <pip-remove-item-buttons [itemId]="item.id" [count]="count(item)" />
                    }
                </div>
            }
        </section>
    </div>
    <pip-add-item-dialog category="apparel" [(open)]="addOpen" />
    `,
    imports: [ListComponent, ListItemComponent, CardComponent, AddItemDialogComponent, RemoveItemButtonsComponent]
})
export class ApparelComponent {
    private readonly _itemsService = inject(ItemsService);
    private readonly _playersService = inject(PlayersService);
    private readonly _roupaSelecionadaUsuarioService = inject(RoupaSelecionadaUsuarioService);
    protected readonly admin = inject(AdminService);
    private readonly _turn = inject(TurnService);

    public elements = computed(() => this._itemsService.byCategory('apparel').filter(item => this.count(item) > 0));
    public selected = signal<Item | null>(null);
    protected readonly addOpen = signal(false);

    constructor() {
        this.selected.set(this.elements()[0] ?? null);
    }

    public select(item: Item) {
        this.selected.set(item);

        const player = this._playersService.selected();
        if (!player || !item.apparelSlot || !this._turn.canAct(player)) return;
        if (this._roupaSelecionadaUsuarioService.equipadoNoSlot(player.id, item.apparelSlot) === item.id) {
            this._roupaSelecionadaUsuarioService.desequipar(player.id, item.apparelSlot);
        } else {
            this._roupaSelecionadaUsuarioService.selecionar(player.id, item.apparelSlot, item.id);
        }
    }

    public isSelected(item: Item) {
        return this.selected()?.id === item.id;
    }

    protected isEquipada(item: Item): boolean {
        const player = this._playersService.selected();
        if (!player || !item.apparelSlot) return false;
        return this._roupaSelecionadaUsuarioService.equipadoNoSlot(player.id, item.apparelSlot) === item.id;
    }

    protected slotLabel(item: Item): string {
        return APPAREL_SLOTS.find(s => s.value === item.apparelSlot)?.label ?? '—';
    }

    /** Quantidade que o jogador selecionado na SESSÃO carrega desse item. */
    protected count(item: Item): number {
        const player = this._playersService.selected();
        return player?.inventory.find(entry => entry.itemId === item.id)?.quantity ?? 0;
    }

    protected sell(item: Item): void {
        const player = this._playersService.selected();
        // O servidor desequipa sozinho se a pilha zerar.
        if (player) this._playersService.sellItem(player.id, item.id);
    }
}
