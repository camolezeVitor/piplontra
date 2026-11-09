import { Component, inject, output, signal } from "@angular/core";
import { ITEM_CATEGORIES, ITEM_RARITIES, ItemCategory, ItemRarity } from "@shared/models/item";
import { GeneratedLootEntry, LootGeneratorService } from "@shared/services/loot-generator.service";

/**
 * Formulário embutível de geração de loot aleatório: QTDE de itens, quais
 * categorias e raridades entram no sorteio. Emite as entradas geradas — quem
 * usa decide o destino (loot de um inimigo no mapa, pilha de loot do grupo, etc.).
 */
@Component({
    selector: 'pip-loot-generator-panel',
    template: `
    <div class="flex flex-col gap-2 p-2 border border-white/30">
        <span class="opacity-60">GERADOR DE LOOT</span>

        <div class="flex flex-row flex-wrap items-center gap-2">
            <label class="field flex items-center gap-1 w-fit">
                <span class="opacity-60">QTDE</span>
                <input type="number" min="1" class="bg-transparent outline-none w-12" [value]="count()" (input)="count.set(number($event))" />
            </label>
            <label class="field flex items-center gap-1 w-fit">
                <span class="opacity-60">ATÉ x</span>
                <input type="number" min="1" class="bg-transparent outline-none w-12" [value]="maxQuantity()" (input)="maxQuantity.set(number($event))" />
            </label>
            <button type="button" class="px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="generate()">
                GERAR LOOT
            </button>
        </div>

        <div class="flex flex-col gap-1">
            <span class="opacity-50">TIPOS DE ITEM (VAZIO = TODOS)</span>
            <div class="flex flex-row flex-wrap gap-1">
                @for (category of categories; track category.value) {
                    <button
                        type="button"
                        class="px-2 py-0.5 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                        [class.bg-white]="selectedCategories().has(category.value)"
                        [class.text-black]="selectedCategories().has(category.value)"
                        (click)="toggleCategory(category.value)"
                    >{{ category.label }}</button>
                }
            </div>
        </div>

        <div class="flex flex-col gap-1">
            <span class="opacity-50">RARIDADE (VAZIO = TODAS)</span>
            <div class="flex flex-row flex-wrap gap-1">
                @for (rarity of rarities; track rarity.value) {
                    <button
                        type="button"
                        class="px-2 py-0.5 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                        [class.bg-white]="selectedRarities().has(rarity.value)"
                        [class.text-black]="selectedRarities().has(rarity.value)"
                        (click)="toggleRarity(rarity.value)"
                    >{{ rarity.label }}</button>
                }
            </div>
        </div>

        @if (lastResult(); as result) {
            <p class="opacity-60">ÚLTIMO SORTEIO: {{ result }} ITEM(NS) DIFERENTE(S).</p>
        }
    </div>
    `,
    styles: `
    .field {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        padding: 0.25rem 0.5rem;
    }
    `,
})
export class LootGeneratorPanelComponent {
    private readonly _generator = inject(LootGeneratorService);

    readonly generated = output<GeneratedLootEntry[]>();

    protected readonly categories = ITEM_CATEGORIES;
    protected readonly rarities = ITEM_RARITIES;

    protected readonly count = signal(3);
    protected readonly maxQuantity = signal(3);
    protected readonly selectedCategories = signal(new Set<ItemCategory>());
    protected readonly selectedRarities = signal(new Set<ItemRarity>());
    protected readonly lastResult = signal<number | null>(null);

    protected toggleCategory(value: ItemCategory): void {
        this.selectedCategories.update(set => this.toggled(set, value));
    }

    protected toggleRarity(value: ItemRarity): void {
        this.selectedRarities.update(set => this.toggled(set, value));
    }

    protected generate(): void {
        const entries = this._generator.generate({
            count: this.count(),
            categories: [...this.selectedCategories()],
            rarities: [...this.selectedRarities()],
            maxQuantity: this.maxQuantity(),
        });
        this.lastResult.set(entries.length);
        if (entries.length) this.generated.emit(entries);
    }

    protected number(event: Event): number {
        const raw = Number((event.target as HTMLInputElement).value);
        return Number.isFinite(raw) && raw > 0 ? raw : 1;
    }

    private toggled<T>(set: Set<T>, value: T): Set<T> {
        const next = new Set(set);
        next.has(value) ? next.delete(value) : next.add(value);
        return next;
    }
}
