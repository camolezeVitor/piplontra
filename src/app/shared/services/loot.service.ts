import { Injectable, inject } from "@angular/core";
import { RealtimeService } from "@shared/services/realtime.service";

/**
 * Loot do grupo: itens largados (ex.: por um inimigo morto no mapa) que
 * qualquer jogador pode pegar pra si. Espelho do servidor — pegar é atômico
 * lá (`loot:claim`), então dois jogadores nunca levam a mesma pilha.
 */
@Injectable({ providedIn: 'root' })
export class LootService {
    private readonly rt = inject(RealtimeService);

    readonly entries = this.rt.loot.asReadonly();

    add(itemId: string, quantity = 1, source = ''): void {
        this.rt.send('loot:add', { itemId, quantity, source });
    }

    addBatch(items: { itemId: string; quantity: number }[], source = ''): void {
        if (!items.length) return;
        this.rt.send('loot:addBatch', { items, source });
    }

    remove(id: string): void {
        this.rt.send('loot:remove', { id });
    }

    /** Move a pilha pro inventário do jogador (o servidor recusa se alguém já pegou). */
    claim(lootId: string, playerId: string): void {
        this.rt.send('loot:claim', { lootId, playerId });
    }
}
