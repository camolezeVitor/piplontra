import { GameMap } from "@shared/models/game-map";
import { Item } from "@shared/models/item";
import { LootEntry } from "@shared/models/loot";
import { Player } from "@shared/models/player";
import { Quest } from "@shared/models/quest";
import { Recipe } from "@shared/models/recipe";
import { Turn } from "@shared/models/turn";

/** Usuário logado, como o servidor manda (sem a senha). */
export interface PublicUser {
    id: string;
    username: string;
    nickname: string;
    avatar: string | null;
    color: string;
    isMaster: boolean;
}

/** Credenciais do handshake do socket — `register: true` cria a conta. */
export interface Credentials {
    username: string;
    password: string;
    nickname?: string;
    register?: boolean;
}

/** Estado inteiro, enviado pelo servidor ao conectar (`state:snapshot`). */
export interface Snapshot {
    me: PublicUser;
    users: PublicUser[];
    items: Item[];
    quests: Quest[];
    recipes: Recipe[];
    players: Player[];
    loot: LootEntry[];
    map: GameMap;
    turn: Turn;
}

export type SyncKey = 'users' | 'items' | 'quests' | 'recipes' | 'players' | 'loot' | 'map' | 'turn';
