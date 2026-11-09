import { Injectable, computed, inject, signal } from "@angular/core";
import { ApparelSlot } from "@shared/models/item";
import { Player, createPlayer } from "@shared/models/player";
import { Recipe } from "@shared/models/recipe";
import { SpecialStat, carryCapacityFor } from "@shared/models/special";
import { ItemsService } from "@shared/services/items.service";
import { RealtimeService } from "@shared/services/realtime.service";

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Jogadores da mesa e seus inventários — espelho do servidor. As regras
 * (usar item, craftar, vender, level-up...) rodam no servidor (`server/src/rules.ts`);
 * aqui só ficam as leituras e o envio dos comandos. O Mestre não é um Player.
 */
@Injectable({ providedIn: 'root' })
export class PlayersService {
    private readonly rt = inject(RealtimeService);
    private readonly _itemsService = inject(ItemsService);

    readonly players = this.rt.players.asReadonly();

    /** O personagem do usuário logado (null pro Mestre). */
    readonly me = computed(() => {
        const userId = this.rt.me()?.id;
        return userId ? this.players().find(player => player.userId === userId) ?? null : null;
    });

    private readonly isMaster = computed(() => this.rt.me()?.isMaster ?? false);

    /** Personagens sem dono — os que um jogador pode escolher ao entrar. */
    readonly freePlayers = computed(() => this.players().filter(player => !player.userId));

    /**
     * Jogador selecionado em SESSÃO — é quem as telas de STAT/INV/CRAFTING mostram.
     * Jogador comum: SEMPRE o próprio personagem (não dá pra abrir o Pip-Boy dos outros).
     * Mestre: quem ele clicou; sem seleção (ou se sumiu), o primeiro da lista.
     */
    private readonly _selectedId = signal<string | null>(null);
    readonly selected = computed(() => {
        if (!this.isMaster()) return this.me();
        return this.players().find(player => player.id === this._selectedId()) ?? this.players()[0] ?? null;
    });
    readonly selectedId = computed(() => this.selected()?.id ?? null);

    /** Mestre seleciona qualquer um; jogador, só o próprio personagem. */
    canSelect(player: Player): boolean {
        return this.isMaster() || (!!player.userId && player.userId === this.rt.me()?.id);
    }

    select(id: string | null): void {
        this._selectedId.set(id);
    }

    /** O jogador assume um personagem livre (o servidor recusa se outro chegou antes). */
    claim(playerId: string): void {
        this.rt.send('players:claim', { playerId });
    }

    /** Troca o personagem do jogador por um livre — o servidor solta o atual e pega o novo de uma vez. */
    switchTo(playerId: string): Promise<void> {
        return this.rt.command('players:switch', { playerId });
    }

    /** O jogador cria o próprio personagem. */
    createOwn(label: string): Player {
        const player = createPlayer({ label });
        this.rt.send('players:createOwn', { player });
        return player;
    }

    /** Mestre define o valor de um atributo SPECIAL (1..10). */
    setSpecial(playerId: string, stat: SpecialStat, value: number): void {
        this.rt.send('players:setSpecial', { playerId, stat, value });
    }

    /** Mestre define quantos pontos de SPECIAL o jogador ainda tem pra distribuir. */
    setSpecialPoints(playerId: string, value: number): void {
        this.rt.send('players:setSpecialPoints', { playerId, value });
    }

    addPlayer(partial: Partial<Player> = {}): Player {
        const player = createPlayer(partial);
        this.rt.send('players:add', { player });
        return player;
    }

    updatePlayer(id: string, changes: Partial<Player>): void {
        this.rt.send('players:update', { playerId: id, changes });
    }

    removePlayer(id: string): void {
        this.rt.send('players:remove', { playerId: id });
        if (this._selectedId() === id) this._selectedId.set(null);
    }

    damagePlayer(playerId: string, amount: number): void {
        this.rt.send('players:damage', { playerId, amount });
    }

    spendAp(playerId: string, amount: number): void {
        this.rt.send('players:spendAp', { playerId, amount });
    }

    /** Troca o retrato do jogador (ver `Player.image`) — o servidor converte a data URL em arquivo. */
    async setPlayerImage(playerId: string, file: File): Promise<void> {
        this.rt.send('players:setImage', { playerId, image: await readAsDataUrl(file) });
    }

    /** Mestre: + cura / − dá dano (o servidor mantém entre 0 e o HP máximo). */
    adjustHp(playerId: string, amount: number): void {
        this.rt.send('players:adjustHp', { playerId, amount });
    }

    /** Mestre: + recupera / − gasta AP (entre 0 e o AP máximo). */
    adjustAp(playerId: string, amount: number): void {
        this.rt.send('players:adjustAp', { playerId, amount });
    }

    /** Mestre: + dá XP (pode subir de nível) / − tira XP do nível atual (não rebaixa). */
    adjustXp(playerId: string, amount: number): void {
        this.rt.send('players:adjustXp', { playerId, amount });
    }

    /** Soma (ou subtrai, se negativo) rads — o servidor nunca deixa negativo. */
    adjustRads(playerId: string, amount: number): void {
        this.rt.send('players:adjustRads', { playerId, amount });
    }

    /** Soma (ou subtrai, se negativo) tampas — o servidor nunca deixa negativo. */
    adjustCoins(playerId: string, amount: number): void {
        this.rt.send('players:adjustCoins', { playerId, amount });
    }

    /** Soma XP; o servidor sobe de nível e distribui os pontos de SPECIAL/perk. */
    addXp(playerId: string, amount: number): void {
        this.rt.send('players:addXp', { playerId, amount });
    }

    allocateSpecialPoint(playerId: string, stat: SpecialStat): void {
        this.rt.send('players:allocateSpecial', { playerId, stat });
    }

    choosePerk(playerId: string, perkId: string): void {
        this.rt.send('players:choosePerk', { playerId, perkId });
    }

    addItem(playerId: string, itemId: string, quantity = 1): void {
        this.rt.send('players:addItem', { playerId, itemId, quantity });
    }

    removeItem(playerId: string, itemId: string): void {
        this.rt.send('players:removeItem', { playerId, itemId });
    }

    setItemQuantity(playerId: string, itemId: string, quantity: number): void {
        this.rt.send('players:setItemQuantity', { playerId, itemId, quantity });
    }

    equipWeapon(playerId: string, itemId: string | null): void {
        this.rt.send('players:equipWeapon', { playerId, itemId });
    }

    equipApparel(playerId: string, slot: ApparelSlot, itemId: string | null): void {
        this.rt.send('players:equipApparel', { playerId, slot, itemId });
    }

    /** Peso total carregado (soma de peso×quantidade do catálogo, ver `ItemsService`). */
    totalWeight(playerId: string): number {
        const player = this.players().find(p => p.id === playerId);
        if (!player) return 0;
        return player.inventory.reduce((sum, entry) => {
            const item = this._itemsService.find(entry.itemId);
            return sum + (item?.weight ?? 0) * entry.quantity;
        }, 0);
    }

    /** Capacidade de carga do jogador — ver `carryCapacityFor` (Força + Resistência). */
    carryCapacity(playerId: string): number {
        const player = this.players().find(p => p.id === playerId);
        return player ? carryCapacityFor(player.special) : 0;
    }

    /** Consome 1 unidade de um item de AJUDA (o servidor aplica `hp`/`rads` e tira do estoque). */
    useAidItem(playerId: string, itemId: string): void {
        this.rt.send('players:useAid', { playerId, itemId });
    }

    /** Dispara a arma EQUIPADA: o servidor gasta 1 bala, se a munição for rastreada. */
    async useWeapon(playerId: string): Promise<'fired' | 'no-ammo'> {
        const { result } = await this.rt.command<{ result: 'fired' | 'no-ammo' }>('players:useWeapon', { playerId });
        return result;
    }

    /** Vende pelo valor de catálogo — o servidor soma as tampas e desequipa se a pilha zerar. */
    sellItem(playerId: string, itemId: string, quantity = 1): void {
        this.rt.send('players:sell', { playerId, itemId, quantity });
    }

    /** Só pra habilitar o botão — quem decide de verdade é o servidor. */
    canCraft(playerId: string, recipe: Recipe): boolean {
        const player = this.players().find(p => p.id === playerId);
        if (!player) return false;
        return recipe.inputs.every(input => {
            const item = this._itemsService.items().find(i => i.label === input.itemLabel);
            if (!item) return false;
            const owned = player.inventory.find(e => e.itemId === item.id)?.quantity ?? 0;
            return owned >= input.quantity;
        });
    }

    craft(playerId: string, recipe: Recipe): void {
        this.rt.send('players:craft', { playerId, recipeId: recipe.id });
    }
}
