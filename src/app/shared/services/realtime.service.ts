import { Injectable, signal } from "@angular/core";
import { GameMap, createEmptyGameMap } from "@shared/models/game-map";
import { Item } from "@shared/models/item";
import { LootEntry } from "@shared/models/loot";
import { Player } from "@shared/models/player";
import { Quest } from "@shared/models/quest";
import { Recipe } from "@shared/models/recipe";
import { Turn, createTurn } from "@shared/models/turn";
import { Credentials, PublicUser, Snapshot, SyncKey } from "@shared/models/user";
import { Socket, io } from "socket.io-client";

type Ack = { ok: true; data?: unknown } | { ok: false; error: string };

const SYNC_KEYS: SyncKey[] = ['users', 'items', 'quests', 'recipes', 'players', 'loot', 'map', 'turn'];

/**
 * Espelho do estado do servidor (ver `server/`). Os signals daqui são a ÚNICA
 * fonte de dados do jogo no front: o servidor manda o `state:snapshot` ao
 * conectar e um `sync:<coleção>` com a lista inteira depois de cada comando.
 * O front nunca altera esses signals por conta própria — só envia comandos.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
    readonly me = signal<PublicUser | null>(null);
    readonly users = signal<PublicUser[]>([]);
    readonly items = signal<Item[]>([]);
    readonly quests = signal<Quest[]>([]);
    readonly recipes = signal<Recipe[]>([]);
    readonly players = signal<Player[]>([]);
    readonly loot = signal<LootEntry[]>([]);
    readonly map = signal<GameMap>(createEmptyGameMap());
    readonly turn = signal<Turn>(createTurn());

    readonly connected = signal(false);
    /** Último erro de comando (ex.: "SÓ O MESTRE.") — some sozinho depois de alguns segundos. */
    readonly error = signal<string | null>(null);

    private socket: Socket | null = null;
    private readonly handlers = new Map<string, Set<(data: any) => void>>();
    private errorTimer: ReturnType<typeof setTimeout> | null = null;

    /** Conecta e resolve no primeiro snapshot; rejeita com a mensagem do servidor (ex.: "LOGIN INVÁLIDO"). */
    connect(credentials: Credentials): Promise<void> {
        this.disconnect();
        return new Promise((resolve, reject) => {
            const socket = io({ auth: { ...credentials }, autoConnect: false });
            this.socket = socket;
            let first = true;

            socket.on('connect', () => this.connected.set(true));
            socket.on('disconnect', () => this.connected.set(false));
            socket.on('connect_error', err => {
                if (!first) return; // reconexão: o socket.io tenta de novo sozinho
                this.disconnect();
                reject(new Error(err.message));
            });
            socket.on('state:snapshot', (snapshot: Snapshot) => {
                this.applySnapshot(snapshot);
                if (!first) return;
                first = false;
                // Reconexões fazem login (nunca "criar conta" de novo).
                socket.auth = { username: credentials.username, password: credentials.password };
                resolve();
            });
            for (const key of SYNC_KEYS) socket.on(`sync:${key}`, value => this.applySync(key, value));
            socket.onAny((event: string, data: unknown) => {
                if (!event.startsWith('sync:') && event !== 'state:snapshot') this.dispatch(event, data);
            });
            socket.connect();
        });
    }

    disconnect(): void {
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.connected.set(false);
        this.me.set(null);
    }

    /** Envia um comando e espera o ack. Rejeita (e preenche `error`) se o servidor recusar. */
    async command<T = unknown>(type: string, payload: unknown = {}): Promise<T> {
        if (!this.socket) return this.fail('SEM CONEXÃO.');
        let ack: Ack;
        try {
            ack = await this.socket.timeout(10_000).emitWithAck('cmd', { type, payload });
        } catch {
            return this.fail('O SERVIDOR NÃO RESPONDEU.');
        }
        if (!ack.ok) return this.fail(ack.error);
        return ack.data as T;
    }

    /** Dispara e esquece — o resultado chega pelo `sync:*`; erro só aparece em `error`. */
    send(type: string, payload: unknown = {}): void {
        this.command(type, payload).catch(() => { /* já está em `error` */ });
    }

    /** Assina um evento efêmero do servidor (ex.: `fx:pulse`). */
    on<T>(event: string, handler: (data: T) => void): void {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event)!.add(handler);
    }

    dispatch(event: string, data: unknown): void {
        this.handlers.get(event)?.forEach(handler => handler(data));
    }

    applySnapshot(snapshot: Snapshot): void {
        this.me.set(snapshot.me);
        for (const key of SYNC_KEYS) this.applySync(key, snapshot[key]);
    }

    applySync(key: SyncKey, value: unknown): void {
        switch (key) {
            case 'users': {
                const users = value as PublicUser[];
                this.users.set(users);
                const me = this.me();
                if (me) this.me.set(users.find(u => u.id === me.id) ?? me);
                break;
            }
            case 'items': this.items.set(value as Item[]); break;
            case 'quests': this.quests.set(value as Quest[]); break;
            case 'recipes': this.recipes.set(value as Recipe[]); break;
            case 'players': this.players.set(value as Player[]); break;
            case 'loot': this.loot.set(value as LootEntry[]); break;
            case 'map': this.map.set({ ...createEmptyGameMap(), ...(value as GameMap) }); break;
            case 'turn': this.turn.set({ ...createTurn(), ...(value as Turn) }); break;
        }
    }

    private fail(message: string): never {
        this.error.set(message);
        if (this.errorTimer) clearTimeout(this.errorTimer);
        this.errorTimer = setTimeout(() => this.error.set(null), 4000);
        throw new Error(message);
    }
}
