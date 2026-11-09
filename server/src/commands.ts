/**
 * Tabela de comandos: `type → { perm, sync, run }`.
 * - perm 'master': só o mestre · 'owner': dono do `payload.playerId` ou mestre · 'any': qualquer logado.
 * - sync: coleções que o gateway reenvia pra todo mundo depois do comando.
 * - run: chama as regras; o retorno vira `ack.data` (ou o payload do `fx`, se houver).
 */
import * as rules from './rules';
import { GameMap, MapObject, MapView, Quest, Recipe, State, User, createItem, createMapObject } from './models';

export type Perm = 'master' | 'owner' | 'any';
export type SyncKey = 'items' | 'quests' | 'recipes' | 'players' | 'loot' | 'map' | 'users' | 'turn';
export type Ack = { ok: true; data?: unknown } | { ok: false; error: string };

export interface Cmd {
    perm: Perm;
    sync: SyncKey[];
    /** Evento efêmero emitido pra todos com o retorno do `run` (ex.: pulse no mapa). */
    fx?: string;
    run(s: State, p: any, user: User): unknown;
}

export interface ExecuteResult {
    ack: Ack;
    sync: SyncKey[];
    fx?: { event: string; data: unknown };
}

function pushUnique<T extends { id: string }>(list: T[], entity: T): void {
    if (!entity?.id) throw new Error('ID OBRIGATÓRIO');
    if (list.some(x => x.id === entity.id)) throw new Error('ID DUPLICADO');
    list.push(entity);
}

const removeById = <T extends { id: string }>(list: T[], id: string) => list.filter(x => x.id !== id);

const M = (sync: SyncKey[], run: Cmd['run']): Cmd => ({ perm: 'master', sync, run });
const O = (sync: SyncKey[], run: Cmd['run']): Cmd => ({ perm: 'owner', sync, run });

export const COMMANDS: Record<string, Cmd> = {
    // ---- catálogo ----
    'items:add': M(['items'], (s, p) => pushUnique(s.items, createItem(p.item?.category ?? 'misc', p.item))),
    'items:update': M(['items', 'recipes'], (s, p) => rules.updateItem(s, p.id, p.changes)),
    'items:remove': M(['items', 'players', 'loot', 'map'], (s, p) => rules.removeItem(s, p.id)),

    'recipes:add': M(['recipes'], (s, p) => pushUnique<Recipe>(s.recipes, { label: 'NOVA RECEITA', icon: 'fa-solid fa-flask', inputs: [], outputs: [], ...p.recipe })),
    'recipes:update': M(['recipes'], (s, p) => rules.patchById(s.recipes, p.id, p.changes)),
    'recipes:remove': M(['recipes'], (s, p) => { s.recipes = removeById(s.recipes, p.id); }),

    'quests:add': M(['quests'], (s, p) => pushUnique<Quest>(s.quests, rules.normalizeQuest(p.quest))),
    'quests:update': M(['quests'], (s, p) => rules.patchById(s.quests, p.id, p.changes)),
    'quests:remove': M(['quests'], (s, p) => { s.quests = removeById(s.quests, p.id); }),

    // ---- players: administração ----
    'players:add': M(['players'], (s, p) => pushUnique(s.players, rules.normalizePlayer({ userId: null, ...p.player }))),
    'players:update': M(['players'], (s, p) => rules.patchById(s.players, p.playerId, p.changes)),
    'players:remove': M(['players', 'quests', 'turn'], (s, p) => rules.removePlayer(s, p.playerId)),
    'players:damage': M(['players'], (s, p) => rules.damage(s, p.playerId, p.amount)),
    'players:spendAp': M(['players'], (s, p) => rules.spendAp(s, p.playerId, p.amount)),
    'players:adjustRads': M(['players'], (s, p) => rules.adjustRads(s, p.playerId, p.amount)),
    'players:adjustCoins': M(['players'], (s, p) => rules.adjustCoins(s, p.playerId, p.amount)),
    'players:addXp': M(['players'], (s, p) => rules.addXp(s, p.playerId, p.amount)),
    'players:setImage': M(['players'], (s, p) => { rules.findPlayer(s, p.playerId).image = p.image ?? null; }),
    'players:addItem': M(['players'], (s, p) => {
        rules.findItem(s, p.itemId);
        rules.addToInventory(rules.findPlayer(s, p.playerId), p.itemId, Math.max(1, p.quantity ?? 1));
    }),
    'players:removeItem': M(['players'], (s, p) => rules.removeFromPlayer(s, p.playerId, p.itemId)),
    'players:setItemQuantity': M(['players'], (s, p) => rules.setPlayerItemQuantity(s, p.playerId, p.itemId, p.quantity)),
    'players:adjustHp': M(['players'], (s, p) => rules.adjustHp(s, p.playerId, p.amount)),
    'players:adjustAp': M(['players'], (s, p) => rules.adjustAp(s, p.playerId, p.amount)),
    'players:adjustXp': M(['players'], (s, p) => rules.adjustXp(s, p.playerId, p.amount)),

    // ---- players: ações do personagem (dono ou mestre) ----
    'players:equipWeapon': O(['players'], (s, p) => rules.equipWeapon(s, p.playerId, p.itemId ?? null)),
    'players:equipApparel': O(['players'], (s, p) => rules.equipApparel(s, p.playerId, p.slot, p.itemId ?? null)),
    'players:useAid': O(['players'], (s, p) => rules.useAid(s, p.playerId, p.itemId)),
    'players:useWeapon': O(['players'], (s, p) => ({ result: rules.useWeapon(s, p.playerId) })),
    'players:sell': O(['players'], (s, p) => rules.sell(s, p.playerId, p.itemId, p.quantity ?? 1)),
    'players:craft': O(['players'], (s, p) => rules.craft(s, p.playerId, p.recipeId)),
    'players:allocateSpecial': O(['players'], (s, p) => rules.allocateSpecial(s, p.playerId, p.stat)),
    'players:choosePerk': O(['players'], (s, p) => rules.choosePerk(s, p.playerId, p.perkId)),

    // ---- players: escolha de personagem (qualquer jogador, as travas ficam nas regras) ----
    'players:claim': { perm: 'any', sync: ['players'], run: (s, p, user) => rules.claimPlayer(s, user, p.playerId) },
    'players:switch': { perm: 'any', sync: ['players'], run: (s, p, user) => rules.switchPlayer(s, user, p.playerId) },
    'players:createOwn': { perm: 'any', sync: ['players'], run: (s, p, user) => rules.createOwnPlayer(s, user, p.player ?? {}) },
    'players:setSpecial': M(['players'], (s, p) => rules.setSpecial(s, p.playerId, p.stat, p.value)),
    'players:setSpecialPoints': M(['players'], (s, p) => rules.setSpecialPoints(s, p.playerId, p.value)),

    // ---- loot ----
    'loot:add': M(['loot'], (s, p) => rules.addLootBatch(s, [{ itemId: p.itemId, quantity: p.quantity ?? 1 }], p.source ?? '')),
    'loot:addBatch': M(['loot'], (s, p) => rules.addLootBatch(s, p.items, p.source ?? '')),
    'loot:remove': M(['loot'], (s, p) => { s.loot = removeById(s.loot, p.id); }),
    'loot:claim': O(['loot', 'players'], (s, p) => rules.claimLoot(s, p.lootId, p.playerId)),

    // ---- mapa ----
    'map:setName': M(['map'], (s, p) => { s.map.name = String(p.name ?? ''); }),
    'map:setAmbientLight': M(['map'], (s, p) => rules.setAmbientLight(s, p.value)),
    'map:toggleEffect': M(['map'], (s, p) => rules.toggleEffect(s, p.type)),
    'map:setBackground': M(['map'], (s, p) => { s.map.backgroundImage = p.image ?? null; }),
    'map:addObject': M(['map'], (s, p) => pushUnique<MapObject>(s.map.objects, createMapObject(p.object))),
    'map:updateObject': M(['map'], (s, p) => rules.patchById(s.map.objects, p.id, p.patch)),
    'map:moveObjects': M(['map'], (s, p) => rules.moveObjects(s, p.moves)),
    'map:removeObjects': M(['map'], (s, p) => rules.removeObjects(s, p.ids)),
    'map:addView': M(['map'], (s, p) => pushUnique<MapView>(s.map.views, p.view)),
    'map:updateView': M(['map'], (s, p) => rules.patchById(s.map.views, p.id, p.patch)),
    'map:removeView': M(['map'], (s, p) => { s.map.views = removeById(s.map.views, p.id); }),
    'map:replace': M(['map'], (s, p) => { s.map = rules.normalizeMap(p.map as GameMap); }),
    'map:damageObject': M(['map', 'loot'], (s, p) => rules.damageEnemy(s, p.id, p.amount)),
    'map:moveOwn': O(['map'], (s, p) => rules.moveOwnToken(s, p.playerId, p.objectId, p.x, p.y)),
    // Ping com a cara de quem clicou: nome e cor do personagem (o Mestre sai como "MESTRE").
    'map:pulse': { perm: 'any', sync: [], fx: 'fx:pulse', run: (s, p, user) => {
        const own = s.players.find(pl => pl.userId === user.id);
        const name = own?.label ?? (user.isMaster ? 'MESTRE' : user.nickname || user.username);
        return { x: p.x, y: p.y, from: user.id, name, color: own?.color ?? '#ffffff' };
    } },

    // ---- turnos ----
    'turn:set': M(['turn'], (s, p) => rules.setTurn(s, p.playerId)),
    'turn:end': M(['turn'], s => rules.endTurns(s)),
    /** O Mestre passa o turno de qualquer um; o jogador da vez pode passar o próprio. */
    'turn:next': { perm: 'any', sync: ['turn'], run: (s, _p, user) => {
        if (!user.isMaster) {
            if (!s.turn.playerId) throw new Error('SÓ O MESTRE.');
            if (rules.findPlayer(s, s.turn.playerId).userId !== user.id) throw new Error('NÃO É O SEU TURNO.');
        }
        rules.nextTurn(s);
    } },

    // ---- perfil / migração ----
    'me:update': { perm: 'any', sync: ['users'], run: (_s, p, user) => {
        if (typeof p.nickname === 'string') user.nickname = p.nickname;
        if (typeof p.color === 'string') user.color = p.color;
        if (p.avatar === null || typeof p.avatar === 'string') user.avatar = p.avatar;
        if (typeof p.password === 'string' && p.password) user.password = p.password;
    } },
    'admin:importLegacy': M(['items', 'quests', 'recipes', 'players', 'loot', 'map'], (s, p) => rules.importLegacy(s, p ?? {})),
};

function checkPermission(s: State, user: User, cmd: Cmd, payload: any): void {
    if (user.isMaster || cmd.perm === 'any') return;
    if (cmd.perm === 'master') throw new Error('SÓ O MESTRE.');
    if (rules.findPlayer(s, payload?.playerId).userId !== user.id) throw new Error('ESSE PERSONAGEM NÃO É SEU.');
    // Com turnos ligados, as ações do personagem só valem na vez dele.
    if (s.turn.playerId && s.turn.playerId !== payload.playerId) throw new Error('NÃO É O SEU TURNO.');
}

export function execute(s: State, user: User, type: string, payload: any): ExecuteResult {
    const cmd = COMMANDS[type];
    if (!cmd) return { ack: { ok: false, error: 'COMANDO DESCONHECIDO' }, sync: [] };
    try {
        checkPermission(s, user, cmd, payload);
        const data = cmd.run(s, payload ?? {}, user);
        if (cmd.fx) return { ack: { ok: true }, sync: [], fx: { event: cmd.fx, data } };
        return { ack: data === undefined ? { ok: true } : { ok: true, data }, sync: cmd.sync };
    } catch (e) {
        return { ack: { ok: false, error: (e as Error).message }, sync: [] };
    }
}
