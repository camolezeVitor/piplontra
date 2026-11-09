/** O "banco": o estado inteiro em memória, gravado em `db.json` com debounce e escrita atômica. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Item, State, createTurn } from './models';
import { normalizeMap, normalizePlayer, normalizeQuest } from './rules';
import { seedItems, seedQuests, seedRecipes } from './seed';

export interface DbOptions {
    dir: string;
    masters: string[];
    debounceMs?: number;
}

export class Db {
    state!: State;
    readonly dir: string;
    readonly uploadsDir: string;
    readonly masters: string[];
    private readonly file: string;
    private readonly debounceMs: number;
    private timer: NodeJS.Timeout | null = null;

    constructor(options: DbOptions) {
        this.dir = options.dir;
        this.masters = options.masters.map(m => m.trim().toLowerCase()).filter(Boolean);
        this.debounceMs = options.debounceMs ?? 300;
        this.file = join(this.dir, 'db.json');
        this.uploadsDir = join(this.dir, 'uploads');
    }

    load(): void {
        mkdirSync(this.uploadsDir, { recursive: true });
        if (existsSync(this.file)) {
            copyFileSync(this.file, join(this.dir, 'db.backup.json'));
            this.state = this.normalize(JSON.parse(readFileSync(this.file, 'utf8')));
        } else {
            this.state = {
                version: 1, turn: createTurn(), users: [], players: [], loot: [],
                items: seedItems(), quests: seedQuests(), recipes: seedRecipes(),
                map: normalizeMap(undefined),
            };
        }
        for (const user of this.state.users) user.isMaster = this.masters.includes(user.username);
        this.flush();
    }

    /** Marca que houve mudança: grava uma vez só, `debounceMs` depois da primeira chamada. */
    touch(): void {
        if (this.timer) return;
        this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.debounceMs);
    }

    flush(): void {
        const tmp = `${this.file}.tmp`;
        writeFileSync(tmp, JSON.stringify(this.state, null, 2));
        renameSync(tmp, this.file);
    }

    /** Grava o que estiver pendente (chamado no shutdown). */
    close(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        if (this.state) this.flush();
    }

    private normalize(raw: Partial<State>): State {
        const seedByLabel = new Map(seedItems().map(item => [item.label, item]));
        // Igual ao `backfillMissingFields` do front: só preenche campos que faltam, nunca sobrescreve.
        const backfill = (item: Item): Item => {
            const seed = seedByLabel.get(item.label);
            if (!seed || seed.category !== item.category) return item;
            const { id: _id, ...seedFields } = seed;
            return { ...seedFields, ...item };
        };
        return {
            version: 1,
            turn: { ...createTurn(), ...(raw.turn ?? {}) },
            users: raw.users ?? [],
            items: (raw.items ?? []).map(backfill),
            quests: (raw.quests ?? []).map(normalizeQuest),
            recipes: raw.recipes ?? [],
            players: (raw.players ?? []).map(normalizePlayer),
            loot: raw.loot ?? [],
            map: normalizeMap(raw.map),
        };
    }
}
