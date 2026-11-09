import { Component, inject, input } from "@angular/core";
import { PlayersService } from "@shared/services/players.service";

/**
 * Botões do Mestre no detalhe de um item do INV: tirar 1 unidade ou a pilha
 * inteira do jogador selecionado em SESSÃO. Se o item estava equipado e
 * acabou, o servidor desequipa sozinho.
 */
@Component({
    selector: 'pip-remove-item-buttons',
    template: `
    <div class="flex flex-row gap-1">
        <button
            type="button"
            class="flex-1 px-2 py-1 text-xs border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
            (click)="removeOne()"
        >REMOVER 1</button>
        <button
            type="button"
            class="flex-1 px-2 py-1 text-xs border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
            (click)="removeAll()"
        >REMOVER TUDO ({{ count() }})</button>
    </div>
    `,
    host: { class: 'block' },
})
export class RemoveItemButtonsComponent {
    private readonly players = inject(PlayersService);

    readonly itemId = input.required<string>();
    /** Quantidade que o jogador selecionado tem agora. */
    readonly count = input.required<number>();

    protected removeOne(): void {
        const player = this.players.selected();
        if (player) this.players.setItemQuantity(player.id, this.itemId(), this.count() - 1);
    }

    protected removeAll(): void {
        const player = this.players.selected();
        if (player && confirm(`Remover as ${this.count()} unidade(s) de ${player.label}?`)) {
            this.players.removeItem(player.id, this.itemId());
        }
    }
}
