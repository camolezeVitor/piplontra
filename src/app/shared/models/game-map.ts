import { generateId } from "@shared/utils/id";

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

/** Minúsculo e sem acento — pra busca ignorar "Á"/"a". */
function normalizeText(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filtro da lista de objetos do Mestre: cada palavra do termo precisa aparecer
 * no nome, no nome do tipo ("inimigo", "localização"...), na coordenada
 * ("30x20") ou ser "oculto" (objetos invisíveis pros jogadores).
 */
export function objectMatchesFilter(object: MapObject, term: string): boolean {
    const words = normalizeText(term).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const typeLabel = MAP_OBJECT_TYPES.find(t => t.value === object.type)?.label ?? '';
    const haystack = normalizeText(`${object.label} ${typeLabel} ${object.x}x${object.y} ${object.hidden ? 'oculto' : ''}`);
    return words.every(word => haystack.includes(word));
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
