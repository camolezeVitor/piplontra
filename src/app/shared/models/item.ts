import { generateId } from "@shared/utils/id";

export type ItemCategory = 'weapon' | 'apparel' | 'aid' | 'ammo' | 'junk' | 'misc' | 'mod';

export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
    { value: 'weapon', label: 'ARMAS' },
    { value: 'apparel', label: 'VESTUÁRIO' },
    { value: 'aid', label: 'AJUDA' },
    { value: 'ammo', label: 'MUNIÇÃO' },
    { value: 'junk', label: 'SUCATA' },
    { value: 'misc', label: 'DIVERSOS' },
    { value: 'mod', label: 'MODS' },
];

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** `weight` pesa a chance de sorteio no gerador de loot — quanto maior, mais comum. */
export const ITEM_RARITIES: { value: ItemRarity; label: string; weight: number }[] = [
    { value: 'common', label: 'COMUM', weight: 100 },
    { value: 'uncommon', label: 'INCOMUM', weight: 45 },
    { value: 'rare', label: 'RARO', weight: 18 },
    { value: 'epic', label: 'ÉPICO', weight: 7 },
    { value: 'legendary', label: 'LENDÁRIO', weight: 2 },
];

/** Famílias de arma do universo Fallout — só se aplica a itens `category: 'weapon'`. */
export type WeaponType =
    | 'pistol' | 'rifle' | 'shotgun' | 'smg' | 'heavy'
    | 'energy' | 'explosive' | 'melee' | 'unarmed' | 'throwable';

export const WEAPON_TYPES: { value: WeaponType; label: string }[] = [
    { value: 'pistol', label: 'PISTOLA' },
    { value: 'rifle', label: 'RIFLE' },
    { value: 'shotgun', label: 'ESPINGARDA' },
    { value: 'smg', label: 'SUBMETRALHADORA' },
    { value: 'heavy', label: 'ARMA PESADA' },
    { value: 'energy', label: 'ARMA DE ENERGIA' },
    { value: 'explosive', label: 'EXPLOSIVO' },
    { value: 'melee', label: 'CORPO A CORPO' },
    { value: 'unarmed', label: 'DESARMADO' },
    { value: 'throwable', label: 'ARREMESSÁVEL' },
];

/**
 * Mapeia o `ammoType` (texto livre) de uma arma pro `label` do item de
 * munição correspondente no catálogo (`category: 'ammo'`) — usado por
 * `PlayersService.useWeapon` pra saber de qual munição gastar 1 unidade.
 * Armas com `ammoType` fora desse mapa (corpo-a-corpo, desarmadas, ou
 * munições sem item de catálogo próprio) não têm gasto de munição rastreado.
 */
export const WEAPON_AMMO_TYPE_TO_AMMO_LABEL: Record<string, string> = {
    '10mm': '10mm Round',
    '.44': '.44 Round',
    '.308': '.308 Round',
    '5.56mm': '5.56mm Round',
    '5mm': '5mm Round',
    '.45': '.45 Round',
    '12g': 'Shotgun Shell',
    'Fusion Cell': 'Fusion Cell',
    'Plasma Cartridge': 'Plasma Cartridge',
    '2mm EC': '2mm EC',
    'Railway Spike': 'Railway Spike',
    'Missile': 'Missile',
    'Mini Nuke': 'Mini Nuke',
    'Alien Blaster Round': 'Alien Blaster Round',
    'Cryo Cell': 'Cryo Cell',
    // Armas de cano (Pipe) disparam .38 no Fallout 4.
    'Pipe': '.38 Round',
    '.38': '.38 Round',
    '.32': '.32 Round',
    '.357': '.357 Magnum Round',
    '9mm': '9mm Round',
    '.50': '.50 Caliber Round',
    '12.7mm': '12.7mm Round',
    '.45-70': ".45-70 Gov't Round",
    '20g': '20 Gauge Shell',
    'Flare': 'Flare',
    'Syringer Ammo': 'Syringer Ammo',
    'Cannonball': 'Cannonball',
    'Microfusion Cell': 'Microfusion Cell',
    'Electron Charge Pack': 'Electron Charge Pack',
    'Energy Cell': 'Energy Cell',
    'Gamma Round': 'Gamma Round',
    'Flamer Fuel': 'Flamer Fuel',
    'Harpoon': 'Harpoon',
    'BB': 'BB',
    '40mm Grenade': '40mm Grenade',
    '25mm Grenade': '25mm Grenade',
};

/** Slot de vestuário — só um item por slot pode estar equipado por vez (ver `RoupaSelecionadaUsuarioService`). */
export type ApparelSlot = 'head' | 'chest' | 'arms' | 'legs' | 'outfit';

export const APPAREL_SLOTS: { value: ApparelSlot; label: string }[] = [
    { value: 'head', label: 'CABEÇA' },
    { value: 'chest', label: 'PEITO' },
    { value: 'arms', label: 'BRAÇOS' },
    { value: 'legs', label: 'PERNAS' },
    { value: 'outfit', label: 'TRAJE (CORPO INTEIRO)' },
];

/**
 * Catálogo único de itens do jogo. Os campos abaixo de "weight/value" são
 * específicos de cada categoria (ex.: `damage` só faz sentido pra `weapon`) e
 * por isso são opcionais — cada tela de inventário só lê os campos da sua
 * própria categoria.
 */
export interface Item {
    id: string;
    category: ItemCategory;
    label: string;
    weight: number;
    value: number;
    /** Ausente em itens antigos (persistidos antes desse campo existir) — tratar como 'common'. */
    rarity?: ItemRarity;

    // weapon
    damage?: number;
    range?: number;
    rate?: number;
    ammoType?: string;
    weaponType?: WeaponType;
    // apparel
    dr?: number;
    er?: number;
    rr?: number;
    apparelSlot?: ApparelSlot;
    // aid
    hp?: number;
    rads?: number;
    effect?: string;
    // junk
    component?: string;
    // misc
    isQuest?: boolean;
    // mod
    slot?: string;
}

export function createItem(category: ItemCategory, partial: Partial<Item> = {}): Item {
    return {
        id: generateId('item'),
        category,
        label: 'NOVO ITEM',
        weight: 0,
        value: 0,
        rarity: 'common',
        ...partial,
    };
}
