import { Injectable, inject } from "@angular/core";
import { ApparelSlot } from "@shared/models/item";
import { RealtimeService } from "@shared/services/realtime.service";

/** Itens (itemId do catálogo) equipados por slot — no máximo um item por slot. */
export type EquippedApparel = Partial<Record<ApparelSlot, string>>;

/**
 * Qual roupa cada jogador tem equipada em cada slot — derivado de
 * `Player.equippedApparel` no servidor. Equipar num slot ocupado substitui o
 * anterior (o servidor garante "um item por slot").
 */
@Injectable({ providedIn: 'root' })
export class RoupaSelecionadaUsuarioService {
    private readonly rt = inject(RealtimeService);

    selecionar(usuarioId: string, slot: ApparelSlot, itemId: string): void {
        this.rt.send('players:equipApparel', { playerId: usuarioId, slot, itemId });
    }

    desequipar(usuarioId: string, slot: ApparelSlot): void {
        this.rt.send('players:equipApparel', { playerId: usuarioId, slot, itemId: null });
    }

    equipadoNoSlot(usuarioId: string, slot: ApparelSlot): string | undefined {
        return this.equipamentos(usuarioId)[slot];
    }

    equipamentos(usuarioId: string): EquippedApparel {
        return this.rt.players().find(player => player.id === usuarioId)?.equippedApparel ?? {};
    }
}
