import { Injectable, inject } from "@angular/core";
import { ITEM_CATEGORIES, ITEM_RARITIES, Item, ItemCategory, ItemRarity } from "@shared/models/item";
import { ItemsService } from "@shared/services/items.service";

export interface LootGeneratorOptions {
    /** Quantos itens sortear (com reposição — pode repetir item, acumulando quantidade). */
    count: number;
    /** Vazio = todas as categorias. */
    categories: ItemCategory[];
    /** Vazio = todas as raridades. */
    rarities: ItemRarity[];
    /** Cada acerto ganha uma quantidade aleatória entre 1 e esse teto. */
    maxQuantity?: number;
}

export interface GeneratedLootEntry {
    itemId: string;
    quantity: number;
}

/**
 * Sorteia itens do catálogo pra montar loot (de inimigos no mapa, baús,
 * recompensas, etc.) — ponderado pela raridade de cada item (`ITEM_RARITIES`),
 * filtrável por categoria e raridade.
 */
@Injectable({ providedIn: 'root' })
export class LootGeneratorService {
    private readonly _itemsService = inject(ItemsService);

    generate(options: LootGeneratorOptions): GeneratedLootEntry[] {
        const categories = options.categories.length ? options.categories : ITEM_CATEGORIES.map(c => c.value);
        const rarities = options.rarities.length ? options.rarities : ITEM_RARITIES.map(r => r.value);
        const maxQuantity = Math.max(1, Math.round(options.maxQuantity ?? 3));
        const count = Math.max(1, Math.round(options.count));

        const pool = this._itemsService.items().filter(item =>
            categories.includes(item.category) && rarities.includes(item.rarity ?? 'common')
        );
        if (!pool.length) return [];

        const weights = new Map(ITEM_RARITIES.map(r => [r.value, r.weight]));
        const rolls: GeneratedLootEntry[] = [];

        for (let i = 0; i < count; i++) {
            const item = this.weightedPick(pool, weights);
            if (!item) continue;
            const quantity = 1 + Math.floor(Math.random() * maxQuantity);
            const existing = rolls.find(entry => entry.itemId === item.id);
            if (existing) existing.quantity += quantity;
            else rolls.push({ itemId: item.id, quantity });
        }

        return rolls;
    }

    private weightedPick(pool: Item[], weights: Map<ItemRarity, number>): Item | undefined {
        const total = pool.reduce((sum, item) => sum + (weights.get(item.rarity ?? 'common') ?? 1), 0);
        if (total <= 0) return pool[Math.floor(Math.random() * pool.length)];

        let roll = Math.random() * total;
        for (const item of pool) {
            roll -= weights.get(item.rarity ?? 'common') ?? 1;
            if (roll <= 0) return item;
        }
        return pool[pool.length - 1];
    }
}
