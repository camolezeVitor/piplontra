import { Injectable, computed, inject } from "@angular/core";
import { Player } from "@shared/models/player";
import { RealtimeService } from "@shared/services/realtime.service";

/**
 * Turnos de combate. Com turnos desligados (exploração) todo jogador age no
 * próprio personagem; com turnos ligados, só o da vez. O Mestre age sempre.
 * Quem garante de verdade é o servidor (`NÃO É O SEU TURNO.`) — aqui é só
 * pra UI esconder/mostrar os botões certos.
 */
@Injectable({ providedIn: 'root' })
export class TurnService {
    private readonly rt = inject(RealtimeService);

    readonly turn = this.rt.turn.asReadonly();
    readonly active = computed(() => this.turn().playerId !== null);
    readonly activePlayer = computed(() => this.rt.players().find(p => p.id === this.turn().playerId) ?? null);

    private readonly isMaster = computed(() => this.rt.me()?.isMaster ?? false);

    /** O personagem no turno é o do usuário logado. */
    readonly isMyTurn = computed(() => {
        const userId = this.rt.me()?.id;
        return !!userId && this.activePlayer()?.userId === userId;
    });

    /** Pode agir neste personagem agora? */
    canAct(player: Player | null | undefined): boolean {
        if (!player) return false;
        if (this.isMaster()) return true;
        if (!player.userId || player.userId !== this.rt.me()?.id) return false;
        return !this.active() || this.turn().playerId === player.id;
    }

    /** Pode apertar "passar turno": o Mestre sempre que há turno; o jogador, só no dele. */
    canPass(): boolean {
        return this.active() && (this.isMaster() || this.isMyTurn());
    }

    setTurn(playerId: string): void {
        this.rt.send('turn:set', { playerId });
    }

    next(): void {
        this.rt.send('turn:next', {});
    }

    end(): void {
        this.rt.send('turn:end', {});
    }
}
