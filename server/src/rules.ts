/**
 * Regras do jogo — funções puras que mutam o `State` no lugar.
 * Ação inválida = `throw new Error('MENSAGEM PRO JOGADOR')`.
 * Regra de ouro: validar TUDO antes de mutar, pra um erro nunca deixar o estado pela metade.
 * Portadas do PlayersService/MapService do front.
 */
import {
    ApparelSlot, EnemyLootEntry, GameMap, Item, LootEntry, MapEffectType, PERKS, Player, Quest, Recipe, SpecialStat, State, User,
    WEAPON_AMMO_TYPE_TO_AMMO_LABEL, createEmptyGameMap, createLootEntry, createPlayer, createQuest, createTurn, xpRequiredForLevel,
} from './models';

// ---- utilitários ----

export function patchById<T extends { id: string }>(list: T[], id: string, changes: Partial<T>, keep: (keyof T)[] = []): T {
    const target = list.find(x => x.id === id);
    if (!target) throw new Error('NÃO ENCONTRADO');
    const preserved = Object.fromEntries(['id', ...keep].map(k => [k, target[k as keyof T]]));
    Object.assign(target, changes ?? {}, preserved);
    return target;
}

export function findPlayer(s: State, id: string): Player {
    const player = s.players.find(p => p.id === id);
    if (!player) throw new Error('JOGADOR NÃO ENCONTRADO');
    return player;
}

export function findItem(s: State, id: string): Item {
    const item = s.items.find(i => i.id === id);
    if (!item) throw new Error('ITEM INEXISTENTE');
    return item;
}

const owned = (p: Player, itemId: string) => p.inventory.find(e => e.itemId === itemId)?.quantity ?? 0;
const byLabel = (s: State, label: string) => s.items.find(i => i.label === label);
const positive = (n: number) => Number.isFinite(n) && n > 0;

// ---- inventário ----

export function addToInventory(p: Player, itemId: string, quantity: number): void {
    const entry = p.inventory.find(e => e.itemId === itemId);
    if (entry) entry.quantity += quantity;
    else p.inventory.push({ itemId, quantity });
}

export function setItemQuantity(p: Player, itemId: string, quantity: number): void {
    if (quantity <= 0) return removeFromInventory(p, itemId);
    const entry = p.inventory.find(e => e.itemId === itemId);
    if (entry) entry.quantity = quantity;
    else p.inventory.push({ itemId, quantity });
}

export function removeFromInventory(p: Player, itemId: string): void {
    p.inventory = p.inventory.filter(e => e.itemId !== itemId);
}

// ---- atributos (mestre) ----

export function damage(s: State, playerId: string, amount: number): void {
    if (!positive(amount)) return;
    const p = findPlayer(s, playerId);
    p.hp = Math.max(0, p.hp - amount);
}

export function spendAp(s: State, playerId: string, amount: number): void {
    if (!positive(amount)) return;
    const p = findPlayer(s, playerId);
    p.ap = Math.max(0, p.ap - amount);
}

export function adjustRads(s: State, playerId: string, amount: number): void {
    if (!Number.isFinite(amount)) return;
    const p = findPlayer(s, playerId);
    p.rads = Math.max(0, p.rads + amount);
}

export function adjustCoins(s: State, playerId: string, amount: number): void {
    if (!Number.isFinite(amount)) return;
    const p = findPlayer(s, playerId);
    p.coins = Math.max(0, p.coins + amount);
}

/** Mestre: soma (ou subtrai) HP, sempre dentro de 0..maxHp. */
export function adjustHp(s: State, playerId: string, amount: number): void {
    if (!Number.isFinite(amount)) return;
    const p = findPlayer(s, playerId);
    p.hp = Math.min(p.maxHp, Math.max(0, p.hp + amount));
}

/** Mestre: soma (ou subtrai) AP, sempre dentro de 0..maxAp. */
export function adjustAp(s: State, playerId: string, amount: number): void {
    if (!Number.isFinite(amount)) return;
    const p = findPlayer(s, playerId);
    p.ap = Math.min(p.maxAp, Math.max(0, p.ap + amount));
}

/** Mestre: positivo = `addXp` (sobe de nível); negativo tira XP do nível atual, sem rebaixar. */
export function adjustXp(s: State, playerId: string, amount: number): void {
    if (!Number.isFinite(amount) || amount === 0) return;
    if (amount > 0) return addXp(s, playerId, amount);
    const p = findPlayer(s, playerId);
    p.xp = Math.max(0, p.xp + amount);
}

/** Mestre tira a pilha inteira do inventário (desequipa se estava equipado). */
export function removeFromPlayer(s: State, playerId: string, itemId: string): void {
    const p = findPlayer(s, playerId);
    removeFromInventory(p, itemId);
    unequipIfGone(p, itemId);
}

/** Mestre define a quantidade; 0 tira do inventário (e desequipa). */
export function setPlayerItemQuantity(s: State, playerId: string, itemId: string, quantity: number): void {
    const p = findPlayer(s, playerId);
    setItemQuantity(p, itemId, quantity);
    unequipIfGone(p, itemId);
}

// ---- progressão ----

export function addXp(s: State, playerId: string, amount: number): void {
    if (!positive(amount)) return;
    const p = findPlayer(s, playerId);
    p.xp += amount;
    while (p.xp >= xpRequiredForLevel(p.level)) {
        p.xp -= xpRequiredForLevel(p.level);
        p.level += 1;
        p.specialPoints += 1;
        p.perkPoints += 1;
    }
}

export function allocateSpecial(s: State, playerId: string, stat: SpecialStat): void {
    const p = findPlayer(s, playerId);
    if (p.specialPoints <= 0) throw new Error('SEM PONTOS DE SPECIAL');
    if (!(stat in p.special)) throw new Error('ATRIBUTO INVÁLIDO');
    p.specialPoints -= 1;
    p.special[stat] += 1;
}

export function choosePerk(s: State, playerId: string, perkId: string): void {
    const p = findPlayer(s, playerId);
    if (p.perkPoints <= 0) throw new Error('SEM PONTOS DE PERK');
    const def = PERKS.find(perk => perk.id === perkId);
    if (!def) throw new Error('PERK INEXISTENTE');
    const rank = p.perkRanks[perkId] ?? 0;
    if (rank >= def.maxRank) throw new Error('RANK MÁXIMO');
    p.perkPoints -= 1;
    p.perkRanks[perkId] = rank + 1;
}

// ---- turnos ----

export function setTurn(s: State, playerId: string): void {
    findPlayer(s, playerId);
    s.turn.playerId = playerId;
}

/** Passa pro próximo da lista de jogadores; do último volta pro primeiro e sobe a rodada. */
export function nextTurn(s: State): void {
    if (!s.players.length) throw new Error('NINGUÉM PRA JOGAR');
    const index = s.players.findIndex(p => p.id === s.turn.playerId);
    if (index === -1) {
        s.turn.playerId = s.players[0].id;
        return;
    }
    const next = (index + 1) % s.players.length;
    if (next === 0) s.turn.round += 1;
    s.turn.playerId = s.players[next].id;
}

export function endTurns(s: State): void {
    s.turn = createTurn();
}

/** O jogador arrasta o token do PRÓPRIO personagem no mapa (o turno é checado no `commands`). */
export function moveOwnToken(s: State, playerId: string, objectId: string, x: number, y: number): void {
    const object = s.map.objects.find(o => o.id === objectId);
    if (!object || object.type !== 'player' || object.playerId !== playerId) throw new Error('ESSE OBJETO NÃO É SEU.');
    object.x = Math.round(Number(x) || 0);
    object.y = Math.round(Number(y) || 0);
}

// ---- escolha de personagem ----

/** Cada jogador tem no máximo um personagem; o Mestre não tem nenhum. */
function assertCanOwn(s: State, user: User): void {
    if (user.isMaster) throw new Error('O MESTRE NÃO TEM PERSONAGEM.');
    if (s.players.some(p => p.userId === user.id)) throw new Error('VOCÊ JÁ TEM UM PERSONAGEM.');
}

/** O jogador assume um personagem livre. Atômico: quem chega primeiro leva. */
export function claimPlayer(s: State, user: User, playerId: string): void {
    const p = findPlayer(s, playerId);
    if (p.userId === user.id) return;
    if (p.userId) throw new Error('ESSE PERSONAGEM JÁ TEM DONO.');
    assertCanOwn(s, user);
    p.userId = user.id;
}

/**
 * Troca de personagem numa operação só: valida o novo ANTES de soltar o atual,
 * então nunca fica sem personagem e nunca pega um que já tem dono.
 */
export function switchPlayer(s: State, user: User, playerId: string): void {
    if (user.isMaster) throw new Error('O MESTRE NÃO TEM PERSONAGEM.');
    const target = findPlayer(s, playerId);
    if (target.userId === user.id) return;
    if (target.userId) throw new Error('ESSE PERSONAGEM JÁ TEM DONO.');
    for (const p of s.players) if (p.userId === user.id) p.userId = null;
    target.userId = user.id;
}

/** O jogador cria o próprio personagem (quando nenhum livre serve). */
export function createOwnPlayer(s: State, user: User, partial: Partial<Player>): void {
    assertCanOwn(s, user);
    if (partial?.id && s.players.some(p => p.id === partial.id)) throw new Error('ID DUPLICADO');
    const label = String(partial?.label ?? '').trim() || user.nickname || user.username;
    s.players.push(normalizePlayer({ ...partial, label, userId: user.id }));
}

// ---- SPECIAL definido pelo mestre ----

export function setSpecial(s: State, playerId: string, stat: SpecialStat, value: number): void {
    const p = findPlayer(s, playerId);
    if (!(stat in p.special)) throw new Error('ATRIBUTO INVÁLIDO');
    p.special[stat] = Math.min(10, Math.max(1, Math.round(Number(value) || 1)));
}

export function setSpecialPoints(s: State, playerId: string, value: number): void {
    findPlayer(s, playerId).specialPoints = Math.max(0, Math.round(Number(value) || 0));
}

// ---- equipar ----

export function equipWeapon(s: State, playerId: string, itemId: string | null): void {
    findPlayer(s, playerId).equippedWeaponId = itemId;
}

export function equipApparel(s: State, playerId: string, slot: ApparelSlot, itemId: string | null): void {
    const p = findPlayer(s, playerId);
    if (itemId) p.equippedApparel[slot] = itemId;
    else delete p.equippedApparel[slot];
}

/** Desequipa o item se o jogador não tiver mais nenhuma unidade dele. */
function unequipIfGone(p: Player, itemId: string): void {
    if (owned(p, itemId) > 0) return;
    if (p.equippedWeaponId === itemId) p.equippedWeaponId = null;
    for (const slot of Object.keys(p.equippedApparel) as ApparelSlot[]) {
        if (p.equippedApparel[slot] === itemId) delete p.equippedApparel[slot];
    }
}

// ---- usar / vender / craftar ----

export function useAid(s: State, playerId: string, itemId: string): void {
    const p = findPlayer(s, playerId);
    const item = findItem(s, itemId);
    if (item.category !== 'aid') throw new Error('ITEM INVÁLIDO');
    const qty = owned(p, itemId);
    if (qty <= 0) throw new Error('SEM ESTOQUE');
    p.hp = Math.max(0, Math.min(p.maxHp, p.hp + (item.hp ?? 0)));
    p.rads = Math.max(0, p.rads + (item.rads ?? 0));
    setItemQuantity(p, itemId, qty - 1);
}

export function useWeapon(s: State, playerId: string): 'fired' | 'no-ammo' {
    const p = findPlayer(s, playerId);
    const weapon = p.equippedWeaponId ? s.items.find(i => i.id === p.equippedWeaponId) : undefined;
    if (!weapon) throw new Error('NENHUMA ARMA EQUIPADA');
    const ammoLabel = weapon.ammoType ? WEAPON_AMMO_TYPE_TO_AMMO_LABEL[weapon.ammoType] : undefined;
    const ammo = ammoLabel ? s.items.find(i => i.label === ammoLabel && i.category === 'ammo') : undefined;
    if (!ammo) return 'fired';
    const qty = owned(p, ammo.id);
    if (qty <= 0) return 'no-ammo';
    setItemQuantity(p, ammo.id, qty - 1);
    return 'fired';
}

export function sell(s: State, playerId: string, itemId: string, quantity = 1): void {
    if (!positive(quantity)) throw new Error('QUANTIDADE INVÁLIDA');
    const p = findPlayer(s, playerId);
    const item = findItem(s, itemId);
    const qty = owned(p, itemId);
    if (qty < quantity) throw new Error('SEM ESTOQUE');
    p.coins += item.value * quantity;
    setItemQuantity(p, itemId, qty - quantity);
    unequipIfGone(p, itemId);
}

export function craft(s: State, playerId: string, recipeId: string): void {
    const p = findPlayer(s, playerId);
    const recipe = s.recipes.find(r => r.id === recipeId);
    if (!recipe) throw new Error('RECEITA INEXISTENTE');

    const inputs = recipe.inputs.map(i => ({ item: byLabel(s, i.itemLabel), quantity: i.quantity }));
    if (inputs.some(i => !i.item || owned(p, i.item.id) < i.quantity)) throw new Error('FALTAM INSUMOS');

    for (const { item, quantity } of inputs) {
        setItemQuantity(p, item!.id, owned(p, item!.id) - quantity);
        unequipIfGone(p, item!.id);
    }
    for (const output of recipe.outputs) {
        const item = byLabel(s, output.itemLabel);
        if (item) addToInventory(p, item.id, output.quantity);
    }
}

// ---- loot ----

export function addLootBatch(s: State, items: EnemyLootEntry[], source = ''): void {
    for (const { itemId, quantity } of items ?? []) s.loot.push(createLootEntry({ itemId, quantity, source }));
}

export function claimLoot(s: State, lootId: string, playerId: string): void {
    const p = findPlayer(s, playerId);
    const entry = s.loot.find(l => l.id === lootId);
    if (!entry) throw new Error('JÁ PEGARAM');
    addToInventory(p, entry.itemId, entry.quantity);
    s.loot = s.loot.filter(l => l.id !== lootId);
}

// ---- mapa ----

export function moveObjects(s: State, moves: { id: string; x: number; y: number }[]): void {
    for (const { id, x, y } of moves ?? []) {
        const object = s.map.objects.find(o => o.id === id);
        if (object) Object.assign(object, { x, y });
    }
}

export function removeObjects(s: State, ids: string[]): void {
    const set = new Set(ids ?? []);
    s.map.objects = s.map.objects.filter(o => !set.has(o.id));
}

export function damageEnemy(s: State, id: string, amount: number): void {
    const object = s.map.objects.find(o => o.id === id);
    if (!object) throw new Error('NÃO ENCONTRADO');
    if (object.type !== 'enemy') throw new Error('NÃO É INIMIGO');
    if (!positive(amount)) return;
    object.hp = Math.max(0, (object.hp ?? 0) - amount);
    if (object.hp > 0) return;
    addLootBatch(s, object.loot ?? [], object.label || 'Inimigo');
    removeObjects(s, [id]);
}

export function setAmbientLight(s: State, value: number): void {
    s.map.ambientLight = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

export function toggleEffect(s: State, type: MapEffectType): void {
    const effects = s.map.effects;
    s.map.effects = effects.includes(type) ? effects.filter(e => e !== type) : [...effects, type];
}

// ---- catálogo / cascatas ----

export function updateItem(s: State, id: string, changes: Partial<Item>): void {
    const oldLabel = findItem(s, id).label;
    const item = patchById(s.items, id, changes, ['category']);
    if (item.label === oldLabel) return;
    for (const recipe of s.recipes) {
        for (const entry of [...recipe.inputs, ...recipe.outputs]) {
            if (entry.itemLabel === oldLabel) entry.itemLabel = item.label;
        }
    }
}

export function removeItem(s: State, id: string): void {
    s.items = s.items.filter(i => i.id !== id);
    for (const p of s.players) {
        removeFromInventory(p, id);
        unequipIfGone(p, id);
    }
    s.loot = s.loot.filter(l => l.itemId !== id);
    for (const object of s.map.objects) {
        if (object.loot) object.loot = object.loot.filter(l => l.itemId !== id);
    }
}

export function removePlayer(s: State, id: string): void {
    s.players = s.players.filter(p => p.id !== id);
    if (s.turn.playerId === id) s.turn = createTurn();
    for (const quest of s.quests) quest.playerIds = (quest.playerIds ?? []).filter(pid => pid !== id);
}

// ---- normalização (dados antigos/incompletos ganham os defaults atuais) ----

export function normalizePlayer(p: Partial<Player> & { isYou?: unknown }): Player {
    const { isYou: _isYou, ...rest } = p;
    const base = createPlayer();
    return {
        ...base,
        ...rest,
        special: { ...base.special, ...(rest.special ?? {}) },
        equippedApparel: { ...(rest.equippedApparel ?? {}) },
        perkRanks: { ...(rest.perkRanks ?? {}) },
        inventory: rest.inventory ?? [],
    } as Player;
}

export function normalizeQuest(q: Partial<Quest>): Quest {
    return { ...createQuest(), ...q, playerIds: q.playerIds ?? [] };
}

export function normalizeMap(m: Partial<GameMap> | undefined): GameMap {
    return { ...createEmptyGameMap(), ...(m ?? {}) };
}

// ---- migração do localStorage ----

export interface LegacyData {
    items?: Item[];
    quests?: Quest[];
    recipes?: Recipe[];
    players?: Player[];
    loot?: LootEntry[];
    map?: GameMap;
    /** `piplontra:arma-selecionada-usuario` — playerId → itemId. */
    arma?: Record<string, string>;
    /** `piplontra:roupa-selecionada-usuario` — playerId → { slot: itemId }. */
    roupa?: Record<string, Partial<Record<ApparelSlot, string>>>;
}

export function importLegacy(s: State, data: LegacyData): void {
    if (Array.isArray(data.items)) s.items = data.items;
    if (Array.isArray(data.quests)) s.quests = data.quests.map(normalizeQuest);
    if (Array.isArray(data.recipes)) s.recipes = data.recipes;
    if (Array.isArray(data.loot)) s.loot = data.loot;
    if (data.map) s.map = normalizeMap(data.map);
    if (Array.isArray(data.players)) {
        const imported = data.players.map(p => normalizePlayer({
            ...p,
            userId: null,
            equippedWeaponId: data.arma?.[p.id] ?? null,
            equippedApparel: data.roupa?.[p.id] ?? {},
        }));
        s.players = [...s.players.filter(p => p.userId), ...imported];
    }
}
