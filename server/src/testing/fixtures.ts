import { Item, Player, State, User, createEmptyGameMap, createPlayer, createTurn } from '../models';

export const master = (o: Partial<User> = {}): User => ({
    id: 'u-master', username: 'mestre', password: '1', nickname: 'Mestre', avatar: null, color: '#ffffff', isMaster: true, ...o,
});
export const userA = (o: Partial<User> = {}): User => ({ ...master(), id: 'u-a', username: 'ana', nickname: 'Ana', isMaster: false, ...o });
export const userB = (o: Partial<User> = {}): User => ({ ...userA(), id: 'u-b', username: 'bia', nickname: 'Bia', ...o });

export const pistol = (): Item => ({ id: 'i-pistol', category: 'weapon', label: '10mm Pistol', weight: 4, value: 50, ammoType: '10mm', damage: 18 });
export const knife = (): Item => ({ id: 'i-knife', category: 'weapon', label: 'Knife', weight: 1, value: 10, ammoType: '' });
export const ammo10 = (): Item => ({ id: 'i-10mm', category: 'ammo', label: '10mm Round', weight: 0, value: 2 });
export const stimpak = (): Item => ({ id: 'i-stim', category: 'aid', label: 'Stimpak', weight: 0, value: 50, hp: 30, rads: 0 });
export const radaway = (): Item => ({ id: 'i-rad', category: 'aid', label: 'RadAway', weight: 0, value: 80, hp: 0, rads: -300 });
export const helmet = (): Item => ({ id: 'i-helmet', category: 'apparel', label: 'Helmet', weight: 2, value: 30, apparelSlot: 'head', dr: 5 });
export const can = (): Item => ({ id: 'i-can', category: 'junk', label: 'Aluminum Can', weight: 0.1, value: 5 });
export const fan = (): Item => ({ id: 'i-fan', category: 'junk', label: 'Desk Fan', weight: 3, value: 15 });

export const player = (o: Partial<Player> = {}): Player => ({ ...createPlayer(), id: 'p-a', label: 'Ana', userId: 'u-a', ...o });

/** Estado mínimo e previsível: 1 player da Ana, catálogo pequeno, 1 receita (2 latas + 1 ventilador → 20 balas 10mm). */
export function makeState(o: Partial<State> = {}): State {
    return {
        version: 1,
        turn: createTurn(),
        users: [master(), userA(), userB()],
        items: [pistol(), knife(), ammo10(), stimpak(), radaway(), helmet(), can(), fan()],
        quests: [],
        loot: [],
        recipes: [{
            id: 'r-ammo', label: 'AMMO', icon: '',
            inputs: [{ itemLabel: 'Aluminum Can', quantity: 2 }, { itemLabel: 'Desk Fan', quantity: 1 }],
            outputs: [{ itemLabel: '10mm Round', quantity: 20 }],
        }],
        players: [player()],
        map: createEmptyGameMap(),
        ...o,
    };
}

export const pa = (s: State, id = 'p-a'): Player => s.players.find(p => p.id === id)!;

/** Inventário do player como `{ itemId: quantidade }` — deixa as asserções curtas. */
export const inv = (s: State, playerId = 'p-a'): Record<string, number> =>
    Object.fromEntries(pa(s, playerId).inventory.map(e => [e.itemId, e.quantity]));
