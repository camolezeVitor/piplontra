import { Injectable, inject } from "@angular/core";
import { Item, ItemCategory, createItem } from "@shared/models/item";
import { RealtimeService } from "@shared/services/realtime.service";

/** Catálogo único de todos os itens do jogo — espelho do servidor (o seed padrão mora em `server/src/seed.ts`). */
@Injectable({ providedIn: 'root' })
export class ItemsService {
    private readonly rt = inject(RealtimeService);

    readonly items = this.rt.items.asReadonly();

    byCategory(category: ItemCategory): Item[] {
        return this.items().filter(item => item.category === category);
    }

    find(id: string): Item | undefined {
        return this.items().find(item => item.id === id);
    }

    addItem(category: ItemCategory, partial: Partial<Item> = {}): Item {
        const item = createItem(category, partial);
        this.rt.send('items:add', { item });
        return item;
    }

    updateItem(id: string, changes: Partial<Item>): void {
        this.rt.send('items:update', { id, changes });
    }

    removeItem(id: string): void {
        this.rt.send('items:remove', { id });
    }
}
