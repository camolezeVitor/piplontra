import { WeaponType } from "@shared/models/item";

export interface PatternCell {
    dx: number;
    dy: number;
}

/**
 * Cada tipo de arma (`WeaponType`, já existe em `item.ts`) tem uma FORMA, e o
 * `range` da arma (também já existe em `Item`) define o TAMANHO — quanto
 * maior o alcance, mais longe o padrão se estende. Ex.: sniper com range 2 é
 * uma cruz 5x5; com range 4, uma cruz 9x9, mesma forma, maior.
 */
type PatternRule = (dx: number, dy: number, range: number) => boolean;

const RULES: Record<WeaponType, PatternRule> = {
    // curto alcance, losango cheio (bolha)
    pistol: (dx, dy, range) => Math.abs(dx) + Math.abs(dy) <= range,
    // cruz pura (só cardeal) — rifles de longo alcance são o "sniper" do catálogo
    // (Hunting/Combat/Assault Rifle), exatamente o formato pedido
    rifle: (dx, dy) => dx === 0 || dy === 0,
    // bloco sólido — estilhaço largo e curto
    shotgun: (dx, dy, range) => Math.max(Math.abs(dx), Math.abs(dy)) <= range,
    // cruz grossa (3 de espessura) — rajada em duas direções
    smg: (dx, dy) => Math.abs(dx) <= 1 || Math.abs(dy) <= 1,
    // bola cheia com cantos cortados — impacto de área
    heavy: (dx, dy, range) => {
        const adx = Math.abs(dx), ady = Math.abs(dy);
        return Math.max(adx, ady) <= range && !(adx === range && ady === range);
    },
    // estrela de 8 pontas (cruz + as duas diagonais) — feixe de energia em todas as direções
    energy: (dx, dy) => dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy),
    // bloco sólido — raio da explosão
    explosive: (dx, dy, range) => Math.max(Math.abs(dx), Math.abs(dy)) <= range,
    // só os 8 vizinhos, ignora o alcance (corpo a corpo é sempre adjacente)
    melee: (dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)) === 1,
    unarmed: (dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)) === 1,
    // losango cheio, igual pistola
    throwable: (dx, dy, range) => Math.abs(dx) + Math.abs(dy) <= range,
};

/** Células (deslocadas do centro, onde fica o player) pintadas por essa arma, no alcance dado. */
export function weaponPatternCells(type: WeaponType, range: number): PatternCell[] {
    const rule = RULES[type] ?? RULES.pistol;
    const r = Math.max(1, Math.round(range));
    const cells: PatternCell[] = [];
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (rule(dx, dy, r)) cells.push({ dx, dy });
        }
    }
    return cells;
}
