import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { Recipe } from "@shared/models/recipe";
import { ItemsService } from "@shared/services/items.service";
import { RecipesService } from "@shared/services/recipes.service";

@Component({
    selector: 'pip-admin-crafting',
    template: `
    <div class="flex flex-row gap-3 h-104">
        <div class="flex flex-col gap-2 w-2/5 min-w-0">
            <input class="field" type="text" placeholder="BUSCAR..." [value]="search()" (input)="search.set(text($event))" />
            <button type="button" class="self-start px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="add()">
                + NOVA RECEITA
            </button>

            <pip-list class="flex-1 overflow-auto min-h-0">
                @for (recipe of elements(); track recipe.id) {
                    <pip-list-item [isActive]="selectedId() === recipe.id" class="flex flex-row justify-between items-center gap-2" (onClick)="select(recipe.id)">
                        <span class="truncate">{{ recipe.label }}</span>
                    </pip-list-item>
                } @empty {
                    <p class="opacity-60 p-2">NENHUMA RECEITA ENCONTRADA.</p>
                }
            </pip-list>
        </div>

        <div class="w-3/5 min-w-0 overflow-auto border-l border-white/20 pl-3">
            @if (selected(); as recipe) {
                <div class="flex flex-col gap-2">
                    <div class="flex flex-row gap-1">
                        <input class="field flex-1" type="text" placeholder="NOME" [value]="recipe.label" (change)="patch(recipe.id, { label: text($event) })" />
                        <button type="button" class="px-2 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="remove(recipe.id)">✕</button>
                    </div>
                    <label class="field flex items-center gap-1 w-fit">
                        <span class="opacity-60">ÍCONE (FONT AWESOME)</span>
                        <input class="bg-transparent outline-none w-48" type="text" [value]="recipe.icon" (change)="patch(recipe.id, { icon: text($event) })" />
                    </label>

                    <div class="flex flex-col gap-1 pt-1 border-t border-white/20">
                        <span class="opacity-80">CONSOME</span>
                        <div class="flex flex-row gap-1">
                            <select class="field flex-1 min-w-0" [value]="inputItemLabel()" (change)="inputItemLabel.set($any($event.target).value)">
                                @for (item of allItems(); track item.id) {
                                    <option [value]="item.label">{{ item.label }}</option>
                                }
                            </select>
                            <input class="field w-14" type="number" min="1" [value]="inputQuantity()" (input)="inputQuantity.set(number($event))" />
                            <button type="button" class="px-2 border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addInput(recipe)">+</button>
                        </div>
                        <div class="flex flex-col gap-1 max-h-28 overflow-auto">
                            @for (entry of recipe.inputs; track entry.itemLabel) {
                                <div class="flex flex-row items-center gap-1">
                                    <span class="flex-1 truncate">{{ entry.itemLabel }} x{{ entry.quantity }}</span>
                                    <button type="button" class="px-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="removeInput(recipe, entry.itemLabel)">✕</button>
                                </div>
                            } @empty {
                                <span class="opacity-50">SEM INSUMOS.</span>
                            }
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 pt-1 border-t border-white/20">
                        <span class="opacity-80">PRODUZ</span>
                        <div class="flex flex-row gap-1">
                            <select class="field flex-1 min-w-0" [value]="outputItemLabel()" (change)="outputItemLabel.set($any($event.target).value)">
                                @for (item of allItems(); track item.id) {
                                    <option [value]="item.label">{{ item.label }}</option>
                                }
                            </select>
                            <input class="field w-14" type="number" min="1" [value]="outputQuantity()" (input)="outputQuantity.set(number($event))" />
                            <button type="button" class="px-2 border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addOutput(recipe)">+</button>
                        </div>
                        <div class="flex flex-col gap-1 max-h-28 overflow-auto">
                            @for (entry of recipe.outputs; track entry.itemLabel) {
                                <div class="flex flex-row items-center gap-1">
                                    <span class="flex-1 truncate">{{ entry.itemLabel }} x{{ entry.quantity }}</span>
                                    <button type="button" class="px-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="removeOutput(recipe, entry.itemLabel)">✕</button>
                                </div>
                            } @empty {
                                <span class="opacity-50">SEM PRODUTOS.</span>
                            }
                        </div>
                    </div>
                </div>
            } @else {
                <p class="opacity-60">SELECIONE UMA RECEITA NA LISTA.</p>
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
export class AdminCraftingComponent {
    private readonly recipesService = inject(RecipesService);
    private readonly itemsService = inject(ItemsService);

    protected readonly search = signal('');
    protected readonly selectedId = signal<string | null>(null);

    protected readonly inputItemLabel = signal('');
    protected readonly inputQuantity = signal(1);
    protected readonly outputItemLabel = signal('');
    protected readonly outputQuantity = signal(1);

    protected readonly allItems = computed(() => this.itemsService.items());

    protected readonly elements = computed(() => {
        const term = this.search().trim().toLowerCase();
        const all = this.recipesService.recipes();
        return term ? all.filter(recipe => recipe.label.toLowerCase().includes(term)) : all;
    });

    protected readonly selected = computed(() => this.recipesService.find(this.selectedId() ?? '') ?? null);

    constructor() {
        this.selectedId.set(this.elements()[0]?.id ?? null);
        const firstLabel = this.allItems()[0]?.label ?? '';
        this.inputItemLabel.set(firstLabel);
        this.outputItemLabel.set(firstLabel);
    }

    protected select(id: string): void {
        this.selectedId.set(id);
    }

    protected add(): void {
        const recipe = this.recipesService.addRecipe();
        this.selectedId.set(recipe.id);
    }

    protected remove(id: string): void {
        this.recipesService.removeRecipe(id);
        if (this.selectedId() === id) this.selectedId.set(this.elements()[0]?.id ?? null);
    }

    protected patch(id: string, changes: Partial<Recipe>): void {
        this.recipesService.updateRecipe(id, changes);
    }

    protected addInput(recipe: Recipe): void {
        const itemLabel = this.inputItemLabel() || this.allItems()[0]?.label;
        if (!itemLabel) return;
        const quantity = Math.max(1, this.inputQuantity());
        const existing = recipe.inputs.find(entry => entry.itemLabel === itemLabel);
        const inputs = existing
            ? recipe.inputs.map(entry => entry.itemLabel === itemLabel ? { ...entry, quantity: entry.quantity + quantity } : entry)
            : [...recipe.inputs, { itemLabel, quantity }];
        this.patch(recipe.id, { inputs });
    }

    protected removeInput(recipe: Recipe, itemLabel: string): void {
        this.patch(recipe.id, { inputs: recipe.inputs.filter(entry => entry.itemLabel !== itemLabel) });
    }

    protected addOutput(recipe: Recipe): void {
        const itemLabel = this.outputItemLabel() || this.allItems()[0]?.label;
        if (!itemLabel) return;
        const quantity = Math.max(1, this.outputQuantity());
        const existing = recipe.outputs.find(entry => entry.itemLabel === itemLabel);
        const outputs = existing
            ? recipe.outputs.map(entry => entry.itemLabel === itemLabel ? { ...entry, quantity: entry.quantity + quantity } : entry)
            : [...recipe.outputs, { itemLabel, quantity }];
        this.patch(recipe.id, { outputs });
    }

    protected removeOutput(recipe: Recipe, itemLabel: string): void {
        this.patch(recipe.id, { outputs: recipe.outputs.filter(entry => entry.itemLabel !== itemLabel) });
    }

    protected text(event: Event): string {
        return (event.target as HTMLInputElement).value;
    }

    protected number(event: Event): number {
        const raw = Number((event.target as HTMLInputElement).value);
        return Number.isFinite(raw) ? raw : 1;
    }
}
