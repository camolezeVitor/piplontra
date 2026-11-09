import { Component, computed, inject, input, model, signal } from "@angular/core";
import { ModalComponent } from "@shared/components/modal/modal.component";
import { ItemCategory } from "@shared/models/item";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";

/**
 * Dialog de "+" do Mestre nas telas de inventário (INV). Adiciona um item do
 * catálogo (filtrado pela categoria daquela tela) pro jogador selecionado em
 * "PARTICIPANTES" — o mesmo que aparece como VOCÊ/selecionado no resto do app.
 */
@Component({
    selector: 'pip-add-item-dialog',
    template: `
    <pip-modal title="ADICIONAR ITEM" [(open)]="open">
        @if (player(); as player) {
            <div class="flex flex-col gap-2">
                <p class="text-xs opacity-60">PARA: {{ player.label }}</p>
                <input
                    class="field"
                    type="text"
                    placeholder="BUSCAR..."
                    [value]="search()"
                    (input)="search.set(text($event))"
                />
                <div class="flex flex-col gap-1 max-h-72 overflow-auto">
                    @for (item of filtered(); track item.id) {
                        <div class="flex flex-row items-center gap-1 p-1 border border-white/30">
                            <span class="flex-1 truncate">{{ item.label }}</span>
                            <input class="field w-14" type="number" min="1" [value]="quantity()" (input)="quantity.set(number($event))" />
                            <button type="button" class="px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="add(player.id, item.id)">
                                ADICIONAR
                            </button>
                        </div>
                    } @empty {
                        <p class="opacity-60">NENHUM ITEM ENCONTRADO.</p>
                    }
                </div>
            </div>
        } @else {
            <p class="opacity-60">SELECIONE UM JOGADOR EM "PARTICIPANTES" PRIMEIRO.</p>
        }
    </pip-modal>
    `,
    styles: `
    .field {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus { background: rgba(255,255,255,0.2); }
    `,
    imports: [ModalComponent],
})
export class AddItemDialogComponent {
    private readonly _itemsService = inject(ItemsService);
    private readonly _playersService = inject(PlayersService);

    readonly category = input.required<ItemCategory>();
    readonly open = model(false);

    protected readonly player = this._playersService.selected;
    protected readonly search = signal('');
    protected readonly quantity = signal(1);

    protected readonly filtered = computed(() => {
        const term = this.search().trim().toLowerCase();
        const items = this._itemsService.byCategory(this.category());
        return term ? items.filter(item => item.label.toLowerCase().includes(term)) : items;
    });

    protected add(playerId: string, itemId: string): void {
        this._playersService.addItem(playerId, itemId, Math.max(1, this.quantity()));
        this.quantity.set(1);
        this.search.set('');
    }

    protected text(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }

    protected number(event: Event): number {
        const raw = Number((event.target as HTMLInputElement).value);
        return Number.isFinite(raw) && raw > 0 ? raw : 1;
    }
}
