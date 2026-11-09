import { Injectable, inject, signal } from "@angular/core";
import { RealtimeService } from "@shared/services/realtime.service";

/** Chaves que o front usava antes de existir servidor (tudo ficava no localStorage). */
export const LEGACY_KEYS = {
    items: 'piplontra:items:v1',
    quests: 'piplontra:quests:v1',
    recipes: 'piplontra:recipes:v1',
    players: 'piplontra:players:v1',
    loot: 'piplontra:loot',
    map: 'piplontra:map',
    arma: 'piplontra:arma-selecionada-usuario',
    roupa: 'piplontra:roupa-selecionada-usuario',
    admin: 'piplontra:admin',
    user: 'piplontra:user',
} as const;

/** Só essas vão pro servidor; `admin`/`user` são apagadas junto (não servem mais pra nada). */
const IMPORTED = ['items', 'quests', 'recipes', 'players', 'loot', 'map', 'arma', 'roupa'] as const;

function read(key: string): unknown {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Migração única: manda pro servidor o que o Mestre montou no navegador antes
 * do backend existir (mapa, catálogo, jogadores...). As imagens em base64 viram
 * arquivo no servidor automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class LegacyImportService {
    private readonly rt = inject(RealtimeService);

    readonly hasData = signal(IMPORTED.some(name => read(LEGACY_KEYS[name]) !== undefined));

    async import(): Promise<void> {
        const payload: Record<string, unknown> = {};
        for (const name of IMPORTED) {
            const value = read(LEGACY_KEYS[name]);
            if (value === undefined) continue;
            // O mapa era salvo como GameMapFile `{ version, map }`.
            payload[name] = name === 'map' ? (value as { map?: unknown }).map : value;
        }
        await this.rt.command('admin:importLegacy', payload);
        try {
            Object.values(LEGACY_KEYS).forEach(key => localStorage.removeItem(key));
        } catch { /* sem permissão */ }
        this.hasData.set(false);
    }
}
