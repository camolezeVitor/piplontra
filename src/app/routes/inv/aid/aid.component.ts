import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { CardComponent } from "@shared/components/card/card.component";
import { Item } from "@shared/models/item";
import { AdminService } from "@shared/services/admin.service";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";
import { TurnService } from "@shared/services/turn.service";
import { AddItemDialogComponent } from "../../../features/admin/add-item-dialog/add-item-dialog.component";
import { RemoveItemButtonsComponent } from "../../../features/admin/remove-item-buttons.component";

@Component({
    selector: "pip-aid",
    template: `
    <div class="flex flex-row h-full py-6 overflow-auto">
        <div class="flex flex-col gap-1 w-2/5! overflow-auto">
            @if (admin.isAdmin()) {
                <button type="button" class="self-end w-full px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addOpen.set(true)">+</button>
            }
            <pip-list class="flex flex-col gap-1 w-full overflow-auto">
                @for (item of elements(); track item.id) {
                    <pip-list-item [isActive]="isSelected(item)" class="flex flex-row justify-between items-center" (onClick)="select(item)">
                        <span>{{ item.label }} ({{ count(item) }})</span>
                    </pip-list-item>
                } @empty {
                    <p class="opacity-60 p-2 text-xs">NENHUM ITEM DE AJUDA NO INVENTÁRIO.</p>
                }
            </pip-list>
        </div>
        <section class="w-3/5 px-6 flex flex-col gap-6">
            @if (selected(); as item) {
                <div class="flex justify-center">
                    <i class="text-white/80 fa-solid fa-kit-medical text-7xl pixelize"></i>
                </div>
                <div class="w-full flex flex-col gap-1">
                    <div class="w-full flex flex-row gap-1">
                        <pip-card class="px-2! py-1! w-full">HP Restore</pip-card>
                        <pip-card class="px-2! py-1! w-fit flex flex-row gap-2 items-center flex-nowrap">
                            <i class="fa-solid fa-heart"></i>
                            <span>{{item.hp}}</span>
                        </pip-card>
                    </div>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Rads</span>
                        <span>{{ (item.rads ?? 0) > 0 ? '+' + item.rads : item.rads }}</span>
                    </pip-card>
                     <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Effect</span>
                        <span class="text-xs">{{item.effect}}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Count</span>
                        <span>{{ count(item) }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Single Wgt</span>
                        <span>{{item.weight}}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Total Wgt</span>
                        <span>{{ (item.weight * count(item)).toFixed(1) }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                        <span>Value</span>
                        <span>{{item.value}}</span>
                    </pip-card>
                    @if (count(item) > 0 && canAct()) {
                        <div class="flex flex-row gap-1 pt-1">
                            <button
                                type="button"
                                class="flex-1 px-2 py-1 text-xs border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black"
                                (click)="use(item)"
                            >USAR 1</button>
                            @if (admin.isAdmin()) {
                            <button
                                type="button"
                                class="flex-1 px-2 py-1 text-xs border border-amber-400/60 text-amber-300 cursor-pointer hover:bg-amber-400 hover:text-black"
                                (click)="sell(item)"
                            >VENDER 1 (+{{ item.value }})</button>
                            }
                        </div>
                    }
                    @if (admin.isAdmin() && count(item) > 0) {
                        <pip-remove-item-buttons [itemId]="item.id" [count]="count(item)" />
                    }
                </div>
            }
        </section>
    </div>
    <pip-add-item-dialog category="aid" [(open)]="addOpen" />
    `,
    imports: [ListComponent, ListItemComponent, CardComponent, AddItemDialogComponent, RemoveItemButtonsComponent]
})
export class AidComponent {
    private readonly _itemsService = inject(ItemsService);
    private readonly _playersService = inject(PlayersService);
    protected readonly admin = inject(AdminService);
    private readonly _turn = inject(TurnService);
    /** Jogador usa itens no próprio personagem (na vez dele, se houver turno); Mestre sempre. */
    protected readonly canAct = computed(() => this._turn.canAct(this._playersService.selected()));

    public elements = computed(() => this._itemsService.byCategory('aid').filter(item => this.count(item) > 0));
    public selected = signal<Item | null>(null);
    protected readonly addOpen = signal(false);

    private readonly me = computed(() => this._playersService.selected());

    constructor() {
        this.selected.set(this.elements()[0] ?? null);
    }

    public count(item: Item): number {
        return this.me()?.inventory.find(entry => entry.itemId === item.id)?.quantity ?? 0;
    }

    public select(item: Item) {
        this.selected.set(item);
    }

    public isSelected(item: Item) {
        return this.selected()?.id === item.id;
    }

    protected use(item: Item): void {
        const player = this.me();
        if (player) this._playersService.useAidItem(player.id, item.id);
    }

    protected sell(item: Item): void {
        const player = this.me();
        if (player) this._playersService.sellItem(player.id, item.id);
    }
}
