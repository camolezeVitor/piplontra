/** Turno de combate (espelho do servidor). `playerId` null = turnos desligados (exploração). */
export interface Turn {
    playerId: string | null;
    /** Rodada atual — sobe quando o "próximo turno" volta pro primeiro da lista. */
    round: number;
}

export function createTurn(): Turn {
    return { playerId: null, round: 1 };
}
