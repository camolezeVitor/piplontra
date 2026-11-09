import { Injectable, computed, inject } from "@angular/core";
import { RealtimeService } from "@shared/services/realtime.service";

/**
 * Qual arma (itemId do catálogo) cada jogador tem equipada — derivado de
 * `Player.equippedWeaponId` no servidor. A API antiga (por id de jogador) foi
 * mantida pra não mexer em quem já usa este service.
 */
@Injectable({ providedIn: 'root' })
export class ArmaSelecionadaUsuarioService {
    private readonly rt = inject(RealtimeService);

    readonly armaPorUsuario = computed(() => new Map(
        this.rt.players()
            .filter(player => !!player.equippedWeaponId)
            .map(player => [player.id, player.equippedWeaponId as string])
    ));

    selecionar(usuarioId: string, itemId: string): void {
        this.rt.send('players:equipWeapon', { playerId: usuarioId, itemId });
    }

    armaDoUsuario(usuarioId: string): string | undefined {
        return this.armaPorUsuario().get(usuarioId);
    }

    limpar(usuarioId: string): void {
        this.rt.send('players:equipWeapon', { playerId: usuarioId, itemId: null });
    }
}
