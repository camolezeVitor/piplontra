import { Injectable, inject } from "@angular/core";
import { Recipe } from "@shared/models/recipe";
import { RealtimeService } from "@shared/services/realtime.service";
import { generateId } from "@shared/utils/id";

/** Catálogo de receitas de crafting — espelho do servidor; o Mestre cria/edita pelo painel de admin. */
@Injectable({ providedIn: 'root' })
export class RecipesService {
    private readonly rt = inject(RealtimeService);

    readonly recipes = this.rt.recipes.asReadonly();

    find(id: string): Recipe | undefined {
        return this.recipes().find(recipe => recipe.id === id);
    }

    addRecipe(partial: Partial<Recipe> = {}): Recipe {
        const recipe: Recipe = {
            id: generateId('recipe'),
            label: 'NOVA RECEITA',
            icon: 'fa-solid fa-flask',
            inputs: [],
            outputs: [],
            ...partial,
        };
        this.rt.send('recipes:add', { recipe });
        return recipe;
    }

    updateRecipe(id: string, changes: Partial<Recipe>): void {
        this.rt.send('recipes:update', { id, changes });
    }

    removeRecipe(id: string): void {
        this.rt.send('recipes:remove', { id });
    }
}
