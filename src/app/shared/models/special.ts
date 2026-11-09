export type SpecialStat =
    | 'strength' | 'perception' | 'endurance' | 'charisma'
    | 'intelligence' | 'agility' | 'luck';

export interface SpecialStatDef {
    value: SpecialStat;
    label: string;
    icon: string;
    description: string;
}

export const SPECIAL_STATS: SpecialStatDef[] = [
    { value: 'strength', label: 'STRENGTH', icon: 'fa-solid fa-dumbbell', description: 'Força física bruta. Aumenta dano corpo-a-corpo e o peso que você pode carregar.' },
    { value: 'perception', label: 'PERCEPTION', icon: 'fa-solid fa-eye', description: 'Sua percepção dos detalhes. Aumenta precisão no VATS e detecção de inimigos.' },
    { value: 'endurance', label: 'ENDURANCE', icon: 'fa-solid fa-heart', description: 'Vitalidade e resistência física. Aumenta saúde e resistência à radiação.' },
    { value: 'charisma', label: 'CHARISMA', icon: 'fa-solid fa-comments', description: 'Sua habilidade social e persuasão. Melhora diálogos e preços.' },
    { value: 'intelligence', label: 'INTELLIGENCE', icon: 'fa-solid fa-brain', description: 'Sua capacidade mental. Aumenta XP ganho e habilidades de hackear.' },
    { value: 'agility', label: 'AGILITY', icon: 'fa-solid fa-person-running', description: 'Reflexos e coordenação. Aumenta pontos de ação e furtividade.' },
    { value: 'luck', label: 'LUCK', icon: 'fa-solid fa-star', description: 'Sua sorte geral na vida. Melhora crítico e chance de encontrar itens raros.' },
];

export type Special = Record<SpecialStat, number>;

export function createDefaultSpecial(): Special {
    return { strength: 5, perception: 5, endurance: 5, charisma: 5, intelligence: 5, agility: 5, luck: 5 };
}

/** Capacidade de carga — fórmula homebrew: base + Força×10 + Resistência×5. */
export function carryCapacityFor(special: Special): number {
    return 75 + special.strength * 10 + special.endurance * 5;
}
