import { TestBed } from '@angular/core/testing';
import { ItemsService } from '@shared/services/items.service';
import { LootService } from '@shared/services/loot.service';
import { QuestsService } from '@shared/services/quests.service';
import { RealtimeService } from '@shared/services/realtime.service';
import { RecipesService } from '@shared/services/recipes.service';

/** Items, quests, receitas e loot: espelham o RealtimeService e só mandam comandos. */
describe('services de catálogo', () => {
    let rt: RealtimeService;
    let send: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        rt = TestBed.inject(RealtimeService);
        send = spyOn(rt, 'send');
    });

    describe('ItemsService', () => {
        it('espelha rt.items e busca por categoria', () => {
            const items = TestBed.inject(ItemsService);
            rt.items.set([{ id: 'a', category: 'weapon', label: 'A', weight: 0, value: 0 }, { id: 'b', category: 'aid', label: 'B', weight: 0, value: 0 }]);
            expect(items.byCategory('aid').map(i => i.id)).toEqual(['b']);
            expect(items.find('a')?.label).toBe('A');
        });
        it('addItem cria o item no cliente, envia items:add e devolve na hora', () => {
            const item = TestBed.inject(ItemsService).addItem('junk', { label: 'Lata' });
            expect(item).toEqual(jasmine.objectContaining({ category: 'junk', label: 'Lata' }));
            expect(send).toHaveBeenCalledWith('items:add', { item });
        });
        it('updateItem e removeItem enviam os comandos', () => {
            const items = TestBed.inject(ItemsService);
            items.updateItem('a', { value: 3 });
            items.removeItem('a');
            expect(send.calls.allArgs()).toEqual([['items:update', { id: 'a', changes: { value: 3 } }], ['items:remove', { id: 'a' }]]);
        });
    });

    describe('QuestsService', () => {
        it('espelha rt.quests', () => {
            const quests = TestBed.inject(QuestsService);
            rt.quests.set([{ id: 'q', label: 'Q', location: '', objective: '', progress: '', status: 'ACTIVE', playerIds: [] }]);
            expect(quests.quests().length).toBe(1);
        });
        it('addQuest / updateQuest / removeQuest enviam os comandos', () => {
            const quests = TestBed.inject(QuestsService);
            const quest = quests.addQuest({ label: 'Nova' });
            quests.updateQuest(quest.id, { status: 'COMPLETED' });
            quests.removeQuest(quest.id);
            expect(send.calls.allArgs()).toEqual([
                ['quests:add', { quest }],
                ['quests:update', { id: quest.id, changes: { status: 'COMPLETED' } }],
                ['quests:remove', { id: quest.id }],
            ]);
        });
    });

    describe('QuestsService.togglePlayer', () => {
        it('liga e desliga o jogador em playerIds via quests:update', () => {
            const quests = TestBed.inject(QuestsService);
            rt.quests.set([{ id: 'q', label: 'Q', location: '', objective: '', progress: '', status: 'ACTIVE', playerIds: ['p-a'] }]);
            quests.togglePlayer('q', 'p-b');
            quests.togglePlayer('q', 'p-a');
            expect(send.calls.allArgs()).toEqual([
                ['quests:update', { id: 'q', changes: { playerIds: ['p-a', 'p-b'] } }],
                ['quests:update', { id: 'q', changes: { playerIds: [] } }],
            ]);
        });
    });

    describe('RecipesService', () => {
        it('addRecipe / updateRecipe / removeRecipe enviam os comandos', () => {
            const recipes = TestBed.inject(RecipesService);
            const recipe = recipes.addRecipe();
            recipes.updateRecipe(recipe.id, { label: 'X' });
            recipes.removeRecipe(recipe.id);
            expect(recipe.label).toBe('NOVA RECEITA');
            expect(send.calls.allArgs()).toEqual([
                ['recipes:add', { recipe }],
                ['recipes:update', { id: recipe.id, changes: { label: 'X' } }],
                ['recipes:remove', { id: recipe.id }],
            ]);
        });
        it('find busca no espelho', () => {
            rt.recipes.set([{ id: 'r', label: 'R', icon: '', inputs: [], outputs: [] }]);
            expect(TestBed.inject(RecipesService).find('r')?.label).toBe('R');
        });
    });

    describe('LootService', () => {
        it('espelha rt.loot em entries', () => {
            const loot = TestBed.inject(LootService);
            rt.loot.set([{ id: 'l', itemId: 'i', quantity: 1, source: '' }]);
            expect(loot.entries().length).toBe(1);
        });
        it('add / addBatch / remove / claim enviam os comandos', () => {
            const loot = TestBed.inject(LootService);
            loot.add('i', 2, 'Baú');
            loot.addBatch([{ itemId: 'i', quantity: 1 }], 'Gerado');
            loot.remove('l');
            loot.claim('l', 'p');
            expect(send.calls.allArgs()).toEqual([
                ['loot:add', { itemId: 'i', quantity: 2, source: 'Baú' }],
                ['loot:addBatch', { items: [{ itemId: 'i', quantity: 1 }], source: 'Gerado' }],
                ['loot:remove', { id: 'l' }],
                ['loot:claim', { lootId: 'l', playerId: 'p' }],
            ]);
        });
        it('addBatch vazio não envia nada', () => {
            TestBed.inject(LootService).addBatch([]);
            expect(send).not.toHaveBeenCalled();
        });
    });
});
