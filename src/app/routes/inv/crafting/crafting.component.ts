import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { CardComponent } from "@shared/components/card/card.component";
import { Recipe } from "@shared/models/recipe";
import { AdminService } from "@shared/services/admin.service";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";
import { TurnService } from "@shared/services/turn.service";
import { RecipesService } from "@shared/services/recipes.service";

@Component({
    selector: "pip-crafting",
    template: `
    <div class="flex flex-row h-full py-6 overflow-auto">
        <div class="flex flex-col gap-1 w-2/5! overflow-auto">
            <pip-list class="flex flex-col gap-1 w-full overflow-auto">
                @for (recipe of recipes(); track recipe.id) {
                    <pip-list-item
                        [isActive]="isSelected(recipe)"
                        class="flex flex-row justify-between items-center gap-2"
                        (onClick)="select(recipe)"
                    >
                        <span class="truncate">{{ recipe.label }}</span>
                        @if (canCraft(recipe)) {
                            <span class="shrink-0 text-xs text-lime-400">OK</span>
                        }
                    </pip-list-item>
                } @empty {
                    <p class="opacity-60 p-2 text-xs">NENHUMA RECEITA CADASTRADA.</p>
                }
            </pip-list>
        </div>

        <section class="w-3/5 px-6 flex flex-col gap-4">
            @if (selected(); as recipe) {
                <div class="flex justify-center">
                    <i [class]="recipe.icon" class="text-white/80 text-7xl pixelize"></i>
                </div>

                <div class="flex flex-col gap-1">
                    <p class="opacity-60 text-xs font-black">CONSOME</p>
                    @for (input of recipe.inputs; track input.itemLabel) {
                        <pip-card
                            class="px-2! py-1! w-full justify-between bg-white/10!"
                            [class.text-red-400]="ownedOf(input.itemLabel) < input.quantity"
                        >
                            <span>{{ input.itemLabel }}</span>
                            <span>{{ ownedOf(input.itemLabel) }}/{{ input.quantity }}</span>
                        </pip-card>
                    }
                </div>

                <div class="flex flex-col gap-1">
                    <p class="opacity-60 text-xs font-black">PRODUZ</p>
                    @for (output of recipe.outputs; track output.itemLabel) {
                        <pip-card class="px-2! py-1! w-full justify-between bg-white/10!">
                            <span>{{ output.itemLabel }}</span>
                            <span>x{{ output.quantity }}</span>
                        </pip-card>
                    }
                </div>

                @if (canAct()) {
                    <button
                        type="button"
                        class="self-center px-3 py-1 text-xs border border-lime-500/60 text-lime-400 cursor-pointer
                               hover:bg-lime-500 hover:text-black
                               disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-lime-400"
                        [disabled]="!canCraft(recipe)"
                        (click)="craft(recipe)"
                    >CRAFTAR</button>
                }
            }
        </section>
    </div>
    `,
    styles: [`
        .pixelize {
            image-rendering: pixelated;
            filter: contrast(180%) brightness(130%);
        }
    `],
    imports: [ListComponent, ListItemComponent, CardComponent]
})
export class CraftingComponent {
    private readonly itemsService = inject(ItemsService);
    private readonly playersService = inject(PlayersService);
    private readonly recipesService = inject(RecipesService);
    protected readonly admin = inject(AdminService);
    private readonly turn = inject(TurnService);
    protected readonly canAct = computed(() => this.turn.canAct(this.playersService.selected()));

    protected readonly recipes = this.recipesService.recipes;
    protected readonly selectedId = signal<string | null>(null);
    protected readonly selected = computed(() => this.recipes().find(r => r.id === this.selectedId()) ?? null);
    private readonly me = computed(() => this.playersService.selected());

    constructor() {
        this.selectedId.set(this.recipes()[0]?.id ?? null);
    }

    protected select(recipe: Recipe): void {
        this.selectedId.set(recipe.id);
    }

    protected isSelected(recipe: Recipe): boolean {
        return this.selectedId() === recipe.id;
    }

    protected ownedOf(itemLabel: string): number {
        const player = this.me();
        if (!player) return 0;
        const item = this.itemsService.items().find(i => i.label === itemLabel);
        if (!item) return 0;
        return player.inventory.find(entry => entry.itemId === item.id)?.quantity ?? 0;
    }

    protected canCraft(recipe: Recipe): boolean {
        const player = this.me();
        return !!player && this.playersService.canCraft(player.id, recipe);
    }

    protected craft(recipe: Recipe): void {
        const player = this.me();
        if (player) this.playersService.craft(player.id, recipe);
    }
}
