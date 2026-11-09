import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { APPAREL_SLOTS, ITEM_CATEGORIES, ITEM_RARITIES, Item, ItemCategory, WEAPON_TYPES } from "@shared/models/item";
import { ItemsService } from "@shared/services/items.service";

type FieldType = 'text' | 'number' | 'checkbox' | 'select';
type FieldDef = { key: keyof Item; label: string; type: FieldType; options?: { value: string; label: string }[] };

const CATEGORY_FIELDS: Record<ItemCategory, FieldDef[]> = {
    weapon: [
        { key: 'weaponType', label: 'TIPO', type: 'select', options: WEAPON_TYPES },
        { key: 'damage', label: 'DANO', type: 'number' },
        { key: 'range', label: 'ALCANCE', type: 'number' },
        { key: 'rate', label: 'CADÊNCIA', type: 'number' },
        { key: 'ammoType', label: 'MUNIÇÃO', type: 'text' },
    ],
    apparel: [
        { key: 'apparelSlot', label: 'SLOT', type: 'select', options: APPAREL_SLOTS },
        { key: 'dr', label: 'RES. DANO', type: 'number' },
        { key: 'er', label: 'RES. ENERGIA', type: 'number' },
        { key: 'rr', label: 'RES. RAD', type: 'number' },
    ],
    aid: [
        { key: 'hp', label: 'HP', type: 'number' },
        { key: 'rads', label: 'RADS', type: 'number' },
        { key: 'effect', label: 'EFEITO', type: 'text' },
    ],
    ammo: [],
    junk: [
        { key: 'component', label: 'COMPONENTE', type: 'text' },
    ],
    misc: [
        { key: 'isQuest', label: 'ITEM DE QUEST', type: 'checkbox' },
    ],
    mod: [
        { key: 'slot', label: 'SLOT', type: 'text' },
    ],
};

@Component({
    selector: 'pip-admin-items',
    template: `
    <div class="flex flex-row gap-3 h-104">
        <div class="flex flex-col gap-2 w-2/5 min-w-0">
            <div class="flex flex-row flex-wrap gap-1">
                @for (category of categories; track category.value) {
                    <button
                        type="button"
                        class="px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                        [class.bg-white]="activeCategory() === category.value"
                        [class.text-black]="activeCategory() === category.value"
                        (click)="setCategory(category.value)"
                    >
                        {{ category.label }}
                    </button>
                }
            </div>
            <input class="field" type="text" placeholder="BUSCAR..." [value]="search()" (input)="search.set(text($event))" />
            <button type="button" class="self-start px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="add()">
                + NOVO ITEM
            </button>

            <pip-list class="flex-1 overflow-auto min-h-0">
                @for (item of elements(); track item.id) {
                    <pip-list-item [isActive]="selectedId() === item.id" class="flex flex-row justify-between items-center gap-2" (onClick)="select(item.id)">
                        <span class="truncate">{{ item.label }}</span>
                        <span class="shrink-0 text-[10px] opacity-60">{{ rarityLabel(item.rarity) }}</span>
                    </pip-list-item>
                } @empty {
                    <p class="opacity-60 p-2">NENHUM ITEM ENCONTRADO.</p>
                }
            </pip-list>
        </div>

        <div class="w-3/5 min-w-0 overflow-auto border-l border-white/20 pl-3">
            @if (selected(); as item) {
                <div class="flex flex-col gap-2">
                    <div class="flex flex-row gap-1">
                        <input class="field flex-1" type="text" placeholder="NOME" [value]="item.label" (change)="patch(item.id, 'label', 'text', $event)" />
                        <button type="button" class="px-2 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="remove(item.id)">✕</button>
                    </div>

                    <div class="flex flex-row flex-wrap gap-1">
                        <label class="field flex items-center gap-1 w-fit">
                            <span class="opacity-60">PESO</span>
                            <input class="bg-transparent outline-none w-16" type="number" step="0.1" [value]="item.weight" (change)="patch(item.id, 'weight', 'number', $event)" />
                        </label>
                        <label class="field flex items-center gap-1 w-fit">
                            <span class="opacity-60">VALOR</span>
                            <input class="bg-transparent outline-none w-16" type="number" [value]="item.value" (change)="patch(item.id, 'value', 'number', $event)" />
                        </label>
                        <label class="field flex items-center gap-1 w-fit">
                            <span class="opacity-60">RARIDADE</span>
                            <select class="bg-transparent outline-none" (change)="patch(item.id, 'rarity', 'text', $event)">
                                @for (rarity of rarities; track rarity.value) {
                                    <option [value]="rarity.value" [selected]="(item.rarity ?? 'common') === rarity.value">{{ rarity.label }}</option>
                                }
                            </select>
                        </label>
                    </div>

                    @if (fields().length) {
                        <div class="flex flex-row flex-wrap gap-1">
                            @for (field of fields(); track field.key) {
                                <label class="field flex items-center gap-1 w-fit">
                                    <span class="opacity-60">{{ field.label }}</span>
                                    @if (field.type === 'checkbox') {
                                        <input type="checkbox" [checked]="!!item[field.key]" (change)="patch(item.id, field.key, field.type, $event)" />
                                    } @else if (field.type === 'select') {
                                        <select class="bg-transparent outline-none" (change)="patch(item.id, field.key, field.type, $event)">
                                            <option value="" [selected]="!item[field.key]">—</option>
                                            @for (option of field.options; track option.value) {
                                                <option [value]="option.value" [selected]="item[field.key] === option.value">{{ option.label }}</option>
                                            }
                                        </select>
                                    } @else {
                                        <input
                                            class="bg-transparent outline-none w-24"
                                            [type]="field.type"
                                            [value]="item[field.key]"
                                            (change)="patch(item.id, field.key, field.type, $event)"
                                        />
                                    }
                                </label>
                            }
                        </div>
                    }
                </div>
            } @else {
                <p class="opacity-60">SELECIONE UM ITEM NA LISTA.</p>
            }
        </div>
    </div>
    `,
    styles: `
    .field {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus-within { background: rgba(255,255,255,0.2); }
    `,
    imports: [ListComponent, ListItemComponent],
})
export class AdminItemsComponent {
    private readonly _itemsService = inject(ItemsService);

    protected readonly categories = ITEM_CATEGORIES;
    protected readonly rarities = ITEM_RARITIES;
    protected readonly activeCategory = signal<ItemCategory>('weapon');
    protected readonly search = signal('');
    protected readonly selectedId = signal<string | null>(null);

    protected readonly elements = computed(() => {
        const term = this.search().trim().toLowerCase();
        const byCategory = this._itemsService.byCategory(this.activeCategory());
        return term ? byCategory.filter(item => item.label.toLowerCase().includes(term)) : byCategory;
    });

    protected readonly selected = computed(() => this._itemsService.find(this.selectedId() ?? '') ?? null);
    protected readonly fields = computed(() => CATEGORY_FIELDS[this.selected()?.category ?? this.activeCategory()]);

    constructor() {
        this.selectedId.set(this.elements()[0]?.id ?? null);
    }

    protected setCategory(category: ItemCategory): void {
        this.activeCategory.set(category);
        this.search.set('');
        this.selectedId.set(this.elements()[0]?.id ?? null);
    }

    protected select(id: string): void {
        this.selectedId.set(id);
    }

    protected add(): void {
        const item = this._itemsService.addItem(this.activeCategory());
        this.selectedId.set(item.id);
    }

    protected remove(id: string): void {
        this._itemsService.removeItem(id);
        if (this.selectedId() === id) this.selectedId.set(this.elements()[0]?.id ?? null);
    }

    protected patch(id: string, key: keyof Item, type: FieldType, event: Event): void {
        const target = event.target as HTMLInputElement;
        const value = type === 'checkbox' ? target.checked : type === 'number' ? Number(target.value) : target.value;
        this._itemsService.updateItem(id, { [key]: value } as Partial<Item>);
    }

    protected rarityLabel(rarity: Item['rarity']): string {
        return this.rarities.find(r => r.value === (rarity ?? 'common'))?.label ?? '';
    }

    protected text(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }
}
