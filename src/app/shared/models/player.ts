import { ApparelSlot } from "@shared/models/item";
import { Special, createDefaultSpecial } from "@shared/models/special";
import { generateId } from "@shared/utils/id";

/** Um item do catálogo (ver `Item`) que um jogador carrega, e em que quantidade. */
export interface PlayerInventoryEntry {
    itemId: string;
    quantity: number;
}

/**
 * Um jogador. O Mestre NÃO é um Player — ele não aparece nessa lista, não tem
 * HP/AP/inventário próprio; ele só gerencia os jogadores daqui (via AdminService).
 */
export interface Player {
    id: string;
    label: string;
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    weapon: string;
    /** Usuário dono do personagem (null = sem dono). "VOCÊ" = `userId === AuthService.me().id`. */
    userId: string | null;
    /** Arma equipada (itemId do catálogo). */
    equippedWeaponId: string | null;
    /** Roupa equipada por slot (itemId do catálogo). */
    equippedApparel: Partial<Record<ApparelSlot, string>>;
    inventory: PlayerInventoryEntry[];
    /** Cor de identificação do jogador (ex.: destaque na lista de participantes). */
    color: string;
    /** Retrato do jogador (data URL) — usado na lista de participantes e pode ser atribuído ao objeto dele no mapa. */
    image: string | null;
    /** Radiação acumulada. Sem teto fixo — o Mestre ajusta livremente (ver `PlayersService.adjustRads`). */
    rads: number;
    /** Tampas (moeda do jogo). */
    coins: number;

    level: number;
    /** XP acumulado desde o último nível — zera (com resto) a cada level-up, ver `xpRequiredForLevel`. */
    xp: number;
    /** Pontos de SPECIAL ainda não alocados, ganhos a cada level-up. */
    specialPoints: number;
    /** Escolhas de perk ainda não feitas, ganhas a cada level-up. */
    perkPoints: number;
    special: Special;
    /** Rank atual de cada perk escolhido (chave = `PerkDef.id`); ausente = rank 0. */
    perkRanks: Record<string, number>;
}

/** XP necessário pra sair do `level` atual pro próximo — curva simples, crescente por nível. */
export function xpRequiredForLevel(level: number): number {
    return level * 100;
}

export function createPlayer(partial: Partial<Player> = {}): Player {
    return {
        id: generateId('player'),
        label: 'NOVO JOGADOR',
        hp: 100,
        maxHp: 100,
        ap: 100,
        maxAp: 100,
        weapon: '',
        userId: null,
        equippedWeaponId: null,
        equippedApparel: {},
        inventory: [],
        color: '#ffffff',
        image: null,
        rads: 0,
        coins: 0,
        level: 1,
        xp: 0,
        specialPoints: 0,
        perkPoints: 0,
        special: createDefaultSpecial(),
        perkRanks: {},
        ...partial,
    };
}
