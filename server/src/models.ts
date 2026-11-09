// Cópia dos models do front (src/app/shared/models) + tipos do servidor. Manter em sincronia.
import { randomUUID } from 'crypto';

const generateId = (_prefix: string): string => randomUUID();

// ---- special.ts ----
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

// ---- perk.ts ----
export interface PerkDef {
    id: string;
    label: string;
    description: string;
    icon: string;
    /** Quantas vezes o perk pode ser escolhido — cada rank soma 1 ponto de perk gasto. */
    maxRank: number;
}

/** Catálogo de perks do universo Fallout (majoritariamente Fallout 4) usado na progressão de nível. */
export const PERKS: PerkDef[] = [
    { id: 'toughness', label: 'TOUGHNESS', description: 'Aumenta sua Resistência a Dano (RD).', icon: 'fa-solid fa-shield-halved', maxRank: 3 },
    { id: 'strong-back', label: 'STRONG BACK', description: 'Aumenta sua capacidade de carga.\nNíveis maiores permitem correr sobrecarregado.', icon: 'fa-solid fa-dumbbell', maxRank: 5 },
    { id: 'gun-nut', label: 'GUN NUT', description: 'Permite criar modificações avançadas de armas.\nArmas mais poderosas exigem maior habilidade.', icon: 'fa-solid fa-gun', maxRank: 4 },
    { id: 'armorer', label: 'ARMORER', description: 'Permite criar e melhorar modificações de armadura.', icon: 'fa-solid fa-shield', maxRank: 4 },
    { id: 'blacksmith', label: 'BLACKSMITH', description: 'Melhora armas corpo-a-corpo e de impacto na bancada.', icon: 'fa-solid fa-hammer', maxRank: 3 },
    { id: 'science', label: 'SCIENCE!', description: 'Permite criar mods avançados de armas de energia e eletrônicos.', icon: 'fa-solid fa-flask', maxRank: 4 },
    { id: 'locksmith', label: 'LOCKSMITH', description: 'Você pode abrir fechaduras avançadas e, com níveis maiores, fechaduras mestre.', icon: 'fa-solid fa-key', maxRank: 4 },
    { id: 'hacker', label: 'HACKER', description: 'Permite hackear terminais avançados.\nCom níveis maiores: expert e master.', icon: 'fa-solid fa-laptop-code', maxRank: 4 },
    { id: 'gunslinger', label: 'GUNSLINGER', description: 'Aumenta dano e chance de acerto crítico com pistolas.', icon: 'fa-solid fa-gun', maxRank: 5 },
    { id: 'rifleman', label: 'RIFLEMAN', description: 'Aumenta dano e chance de acerto crítico com rifles não-automáticos.', icon: 'fa-solid fa-crosshairs', maxRank: 5 },
    { id: 'commando', label: 'COMMANDO', description: 'Aumenta dano e precisão de armas automáticas.', icon: 'fa-solid fa-person-rifle', maxRank: 5 },
    { id: 'heavy-gunner', label: 'HEAVY GUNNER', description: 'Aumenta dano com armas pesadas.', icon: 'fa-solid fa-truck-monster', maxRank: 5 },
    { id: 'demolition-expert', label: 'DEMOLITION EXPERT', description: 'Aumenta dano de explosivos e minas.', icon: 'fa-solid fa-bomb', maxRank: 5 },
    { id: 'blitz', label: 'BLITZ', description: 'Aumenta o alcance de ataques corpo-a-corpo no V.A.T.S.', icon: 'fa-solid fa-bolt', maxRank: 3 },
    { id: 'iron-fist', label: 'IRON FIST', description: 'Aumenta dano desarmado.', icon: 'fa-solid fa-hand-fist', maxRank: 5 },
    { id: 'big-leagues', label: 'BIG LEAGUES', description: 'Aumenta dano corpo-a-corpo.', icon: 'fa-solid fa-baseball-bat-ball', maxRank: 5 },
    { id: 'lone-wanderer', label: 'LONE WANDERER', description: 'Mais dano e resistência quando está sozinho, sem companheiro.', icon: 'fa-solid fa-person-walking', maxRank: 3 },
    { id: 'lifegiver', label: 'LIFEGIVER', description: 'Aumenta sua HP máxima.', icon: 'fa-solid fa-heart-pulse', maxRank: 3 },
    { id: 'medic', label: 'MEDIC', description: 'Itens de cura restauram mais HP.', icon: 'fa-solid fa-kit-medical', maxRank: 4 },
    { id: 'chemist', label: 'CHEMIST', description: 'Drogas e substâncias duram mais tempo.', icon: 'fa-solid fa-vial', maxRank: 2 },
    { id: 'aquaboy', label: 'AQUA BOY', description: 'Não sofre dano de radiação na água e pode respirar embaixo da água.', icon: 'fa-solid fa-water', maxRank: 2 },
    { id: 'ghoulish', label: 'GHOULISH', description: 'Radiação em pequenas doses cura sua HP em vez de causar dano.', icon: 'fa-solid fa-radiation', maxRank: 3 },
    { id: 'adamantium-skeleton', label: 'ADAMANTIUM SKELETON', description: 'Reduz dano em membros e de quedas.', icon: 'fa-solid fa-bone', maxRank: 3 },
    { id: 'cap-collector', label: 'CAP COLLECTOR', description: 'Melhores preços de compra e venda com mercadores.', icon: 'fa-solid fa-coins', maxRank: 3 },
    { id: 'local-leader', label: 'LOCAL LEADER', description: 'Permite estabelecer linhas de abastecimento e construir lojas em assentamentos.', icon: 'fa-solid fa-people-group', maxRank: 2 },
    { id: 'sneak', label: 'SNEAK', description: 'Fica mais furtivo ao se agachar ou se mover devagar.', icon: 'fa-solid fa-person-walking-arrow-right', maxRank: 5 },
    { id: 'mister-sandman', label: 'MISTER SANDMAN', description: 'Permite eliminar inimigos dormindo instantaneamente de forma furtiva.', icon: 'fa-solid fa-bed', maxRank: 3 },
    { id: 'idiot-savant', label: 'IDIOT SAVANT', description: 'Chance aleatória de ganhar XP extra em qualquer ação.', icon: 'fa-solid fa-dice', maxRank: 3 },
    { id: 'scrounger', label: 'SCROUNGER', description: 'Encontra mais munição ao revistar contêineres.', icon: 'fa-solid fa-boxes-stacked', maxRank: 4 },
    { id: 'hackers-delight', label: "HACKER'S DELIGHT", description: 'Falhar um hack não trava mais o terminal.', icon: 'fa-solid fa-microchip', maxRank: 3 },
];

// ---- item.ts ----

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

// ---- quest.ts ----

export type QuestStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED';

export const QUEST_STATUSES: QuestStatus[] = ['ACTIVE', 'INACTIVE', 'COMPLETED'];

export interface Quest {
    id: string;
    label: string;
    location: string;
    objective: string;
    progress: string;
    status: QuestStatus;
    /** Jogadores donos dessa quest (ver `Player`) — vazio/ausente = quest geral, visível pra todo mundo. */
    playerIds: string[];
}

export function createQuest(partial: Partial<Quest> = {}): Quest {
    return {
        id: generateId('quest'),
        label: 'NOVA QUEST',
        location: '',
        objective: '',
        progress: '',
        status: 'ACTIVE',
        playerIds: [],
        ...partial,
    };
}

// ---- loot.ts ----

/** Uma pilha de item largada no "chão" do grupo, disponível pra qualquer jogador pegar. */
export interface LootEntry {
    id: string;
    itemId: string;
    quantity: number;
    /** De onde veio (ex.: label do inimigo que morreu) — só exibição, opcional. */
    source: string;
}

export function createLootEntry(partial: Partial<LootEntry> & Pick<LootEntry, 'itemId'>): LootEntry {
    return {
        id: generateId('loot'),
        quantity: 1,
        source: '',
        ...partial,
    };
}

// ---- recipe.ts ----
/** Ingrediente/produto de receita, referenciado por `label` do catálogo (ver `Item`) — estável mesmo se o id mudar entre sessões. */
export interface RecipeIngredient {
    itemLabel: string;
    quantity: number;
}

export interface Recipe {
    id: string;
    label: string;
    icon: string;
    inputs: RecipeIngredient[];
    outputs: RecipeIngredient[];
}

/** Receitas de crafting — consomem sucata/munição/ajuda do catálogo pra produzir outros itens. */
export const RECIPES: Recipe[] = [
    {
        id: 'ammo-10mm',
        label: 'MUNIÇÃO 10MM (x20)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Aluminum Can', quantity: 2 }, { itemLabel: 'Desk Fan', quantity: 1 }],
        outputs: [{ itemLabel: '10mm Round', quantity: 20 }],
    },
    {
        id: 'ammo-308',
        label: 'MUNIÇÃO .308 (x10)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 1 }, { itemLabel: 'Toy Car', quantity: 1 }],
        outputs: [{ itemLabel: '.308 Round', quantity: 10 }],
    },
    {
        id: 'ammo-shotgun',
        label: 'CARTUCHO 12G (x10)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 1 }, { itemLabel: 'Aluminum Can', quantity: 1 }],
        outputs: [{ itemLabel: 'Shotgun Shell', quantity: 10 }],
    },
    {
        id: 'ammo-fusion-cell',
        label: 'CÉLULA DE FUSÃO (x10)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Desk Fan', quantity: 1 }, { itemLabel: 'Duct Tape', quantity: 1 }],
        outputs: [{ itemLabel: 'Fusion Cell', quantity: 10 }],
    },
    {
        id: 'aid-stimpak',
        label: 'STIMPAK',
        icon: 'fa-solid fa-kit-medical',
        inputs: [{ itemLabel: 'Duct Tape', quantity: 2 }, { itemLabel: 'Iguana on a Stick', quantity: 1 }],
        outputs: [{ itemLabel: 'Stimpak', quantity: 1 }],
    },
    {
        id: 'aid-radaway',
        label: 'RADAWAY',
        icon: 'fa-solid fa-kit-medical',
        inputs: [{ itemLabel: 'Duct Tape', quantity: 1 }, { itemLabel: 'Toy Car', quantity: 1 }],
        outputs: [{ itemLabel: 'RadAway', quantity: 1 }],
    },
    {
        id: 'mod-standard-receiver',
        label: 'RECEPTOR PADRÃO',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 1 }, { itemLabel: 'Desk Fan', quantity: 1 }],
        outputs: [{ itemLabel: 'Standard Receiver', quantity: 1 }],
    },
    {
        id: 'mod-reflex-sight',
        label: 'MIRA REFLEX',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Toy Car', quantity: 1 }, { itemLabel: 'Duct Tape', quantity: 1 }],
        outputs: [{ itemLabel: 'Reflex Sight', quantity: 1 }],
    },
    {
        id: 'mod-long-barrel',
        label: 'CANO LONGO',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 2 }, { itemLabel: 'Desk Fan', quantity: 1 }],
        outputs: [{ itemLabel: 'Long Barrel', quantity: 1 }],
    },
    {
        id: 'mod-comfort-grip',
        label: 'PUNHO CONFORTÁVEL',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Duct Tape', quantity: 1 }, { itemLabel: 'Toy Car', quantity: 1 }],
        outputs: [{ itemLabel: 'Comfort Grip', quantity: 1 }],
    },
    {
        id: 'mod-large-magazine',
        label: 'CARREGADOR GRANDE',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Aluminum Can', quantity: 2 }, { itemLabel: 'Adjustable Wrench', quantity: 1 }],
        outputs: [{ itemLabel: 'Large Magazine', quantity: 1 }],
    },
];

// ---- game-map.ts ----

export type MapObjectType = 'illumination' | 'enemy' | 'player' | 'location' | 'common';

export const MAP_OBJECT_TYPES: { value: MapObjectType; label: string }[] = [
    { value: 'illumination', label: 'ILUMINAÇÃO' },
    { value: 'enemy', label: 'INIMIGO' },
    { value: 'player', label: 'PLAYER' },
    { value: 'location', label: 'LOCALIZAÇÃO' },
    { value: 'common', label: 'COMUM' },
];

/** Cor de preenchimento usada quando o objeto não tem imagem de fundo própria. */
export const MAP_OBJECT_TYPE_COLORS: Record<MapObjectType, string> = {
    illumination: 'bg-yellow-400/50',
    enemy: 'bg-red-500/50',
    player: 'bg-blue-400/50',
    location: 'bg-green-400/50',
    common: 'bg-white/30',
};

export type MapObjectBorder = 'none' | 'dashed' | 'solid';

export const MAP_OBJECT_BORDERS: { value: MapObjectBorder; label: string }[] = [
    { value: 'none', label: 'NENHUMA' },
    { value: 'dashed', label: 'TRACEJADA' },
    { value: 'solid', label: 'SÓLIDA' },
];

export type LightKind = 'point' | 'cone';

export const LIGHT_KINDS: { value: LightKind; label: string }[] = [
    { value: 'point', label: 'PONTO (360°)' },
    { value: 'cone', label: 'LANTERNA (V)' },
];

/** Um item do catálogo (`Item`) carregado por um inimigo — vai pro `LootService` quando ele morre. */
export interface EnemyLootEntry {
    itemId: string;
    quantity: number;
}

/** Um objeto no grid do mapa: um quadrado de 1 tile (16x16), posicionado por célula. */
export interface MapObject {
    id: string;
    x: number;
    y: number;
    label: string;
    type: MapObjectType;
    /** Data URL (base64) opcional — substitui a cor de preenchimento do tipo. */
    backgroundImage: string | null;
    border: MapObjectBorder;
    /** Invisível pros jogadores (o Mestre continua vendo, esmaecido). Ausente = visível. */
    hidden?: boolean;

    // type === 'illumination'
    lightKind?: LightKind;
    /** Alcance da luz, em tiles. */
    lightRadius?: number;
    /** Direção do cone, em graus (0° = direita, sentido horário) — só lightKind 'cone'. */
    lightAngle?: number;
    /** Abertura do cone, em graus — só lightKind 'cone'. */
    lightSpread?: number;

    // type === 'enemy'
    hp?: number;
    maxHp?: number;
    /** 0 = sem estrela (opcional), 1 a 5 = nível de dificuldade mostrado ao lado da health bar. */
    difficultyStars?: number;
    /** Transferido pro `LootService` quando o inimigo morre (hp chega a 0). */
    loot?: EnemyLootEntry[];

    // type === 'player'
    /** Id do `Player` (PlayersService) que esse objeto representa no mapa. */
    playerId?: string;
    /**
     * Pinta o padrão de alcance da arma (`weapon-patterns.ts`) ao redor do player.
     * A arma em si vem de `ArmaSelecionadaUsuarioService` (a que o jogador tem
     * equipada), não de um campo aqui — então nunca desalinha do que está em INV.
     */
    showWeaponRange?: boolean;
}

export function createMapObject(partial: Partial<MapObject> = {}): MapObject {
    return {
        id: generateId('obj'),
        x: 0,
        y: 0,
        label: '',
        type: 'common',
        backgroundImage: null,
        border: 'solid',
        ...partial,
    };
}

/** Vértice de um polígono de visão — coordenada de CANTO do grid (interseção), não de célula. */
export interface MapViewPoint {
    x: number;
    y: number;
}

/**
 * Polígono de visão desenhado pelo Mestre. Se houver pelo menos UMA view
 * habilitada no mapa, os jogadores só enxergam o que está dentro da união das
 * views habilitadas — o Mestre sempre vê tudo (a menos que ligue "ver como
 * jogador", igual a iluminação). Sem nenhuma view habilitada, nada muda.
 */
export interface MapView {
    id: string;
    label: string;
    points: MapViewPoint[];
    enabled: boolean;
}

export type MapEffectType = 'radiation' | 'heat' | 'rain' | 'fog' | 'snow';

/** Efeitos de tela (cima de tudo, não afetados por pan/zoom) — cumulativos, qualquer combinação pode estar ativa. */
export const MAP_EFFECT_TYPES: { value: MapEffectType; label: string }[] = [
    { value: 'radiation', label: 'RADIAÇÃO' },
    { value: 'heat', label: 'SOL QUENTE' },
    { value: 'rain', label: 'CHUVA' },
    { value: 'fog', label: 'NÉVOA' },
    { value: 'snow', label: 'NEVE' },
];

export interface GameMap {
    name: string;
    /** Data URL (base64) da imagem de fundo, ou null se nenhuma foi definida. */
    backgroundImage: string | null;
    objects: MapObject[];
    /** Visibilidade ambiente: 0 = nada visível, 100 = tudo visível (sem escuridão). */
    ambientLight: number;
    /** Efeitos de tela ativos no momento — cumulativo (pode ter vários ao mesmo tempo). */
    effects: MapEffectType[];
    /** Polígonos de visão — ver `MapView`. */
    views: MapView[];
}

export const MAP_FILE_VERSION = 1 as const;

/** Formato tanto do payload salvo no localStorage quanto do arquivo exportado/importado. */
export interface GameMapFile {
    version: typeof MAP_FILE_VERSION;
    map: GameMap;
}

export function createEmptyGameMap(): GameMap {
    return { name: '', backgroundImage: null, objects: [], ambientLight: 100, effects: [], views: [] };
}

// ---- player.ts ----

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
    /** Usuário dono do personagem (null = sem dono). O cliente deriva "VOCÊ" disso. */
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

// ---- servidor ----

export interface User {
    id: string;
    /** Único, lowercase. É a chave de login. */
    username: string;
    /** Texto puro, de propósito (ver docs/spec-backend.md). */
    password: string;
    nickname: string;
    avatar: string | null;
    color: string;
    /** Recalculado a cada boot a partir de MASTER_USERNAMES. */
    isMaster: boolean;
}

export type PublicUser = Omit<User, 'password'>;

/** Turno de combate. `playerId` null = turnos desligados (exploração: todo mundo age livre). */
export interface Turn {
    playerId: string | null;
    /** Rodada atual — sobe quando o "próximo turno" volta pro primeiro da lista. */
    round: number;
}

export function createTurn(): Turn {
    return { playerId: null, round: 1 };
}

export interface State {
    version: 1;
    turn: Turn;
    users: User[];
    items: Item[];
    quests: Quest[];
    recipes: Recipe[];
    players: Player[];
    loot: LootEntry[];
    map: GameMap;
}

export function toPublic(user: User): PublicUser {
    const { password: _password, ...rest } = user;
    return rest;
}
