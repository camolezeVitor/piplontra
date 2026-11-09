import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Db } from './db';
import { makeState, master, userA } from './testing/fixtures';

describe('Db', () => {
    let dir: string;
    const file = () => join(dir, 'db.json');
    const writeDb = (data: unknown) => writeFileSync(file(), JSON.stringify(data));
    const open = (masters: string[] = []) => { const db = new Db({ dir, masters }); db.load(); return db; };

    beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pip-db-')); });
    afterEach(() => { jest.useRealTimers(); rmSync(dir, { recursive: true, force: true }); });

    it('sem db.json cria o estado com o seed (itens, 4 quests, 11 receitas, sem players)', () => {
        const db = open();
        expect(db.state.items.length).toBeGreaterThan(100);
        expect(db.state.quests).toHaveLength(4);
        expect(db.state.recipes).toHaveLength(11);
        expect(db.state.players).toEqual([]);
        expect(db.state.users).toEqual([]);
        expect(existsSync(file())).toBe(true);
        expect(existsSync(join(dir, 'uploads'))).toBe(true);
    });

    it('com db.json carrega e cria db.backup.json', () => {
        writeDb(makeState());
        const db = open();
        expect(db.state.items).toHaveLength(8);
        expect(JSON.parse(readFileSync(join(dir, 'db.backup.json'), 'utf8')).items).toHaveLength(8);
    });

    it('normaliza player antigo com os defaults (rads, special, equippedApparel, userId...)', () => {
        writeDb({ ...makeState(), players: [{ id: 'old', label: 'Velho', hp: 40, isYou: true, inventory: [] }] });
        const p = open().state.players[0];
        expect(p).toMatchObject({ id: 'old', hp: 40, rads: 0, coins: 0, level: 1, userId: null, equippedWeaponId: null, equippedApparel: {} });
        expect(p.special.luck).toBe(5);
        expect('isYou' in p).toBe(false);
    });

    it('normaliza mapa sem views e quest sem playerIds', () => {
        writeDb({ ...makeState(), map: { name: 'M', objects: [] }, quests: [{ id: 'q', label: 'Q' }] });
        const db = open();
        expect(db.state.map).toMatchObject({ name: 'M', views: [], effects: [], ambientLight: 100 });
        expect(db.state.quests[0].playerIds).toEqual([]);
    });

    it('preenche campos novos do seed nos itens por label sem sobrescrever o que foi editado', () => {
        writeDb({ ...makeState(), items: [{ id: 'x', category: 'weapon', label: '10mm Pistol', weight: 4, value: 999 }] });
        const item = open().state.items[0];
        expect(item).toMatchObject({ id: 'x', value: 999, weaponType: 'pistol', damage: 18 });
    });

    it('não ressuscita itens/receitas que o mestre apagou', () => {
        writeDb({ ...makeState(), items: [], recipes: [] });
        const db = open();
        expect(db.state.items).toEqual([]);
        expect(db.state.recipes).toEqual([]);
    });

    it('recalcula isMaster a partir de masters a cada load', () => {
        writeDb({ ...makeState(), users: [master({ isMaster: true }), userA({ isMaster: false })] });
        const db = open(['ana']);
        expect(db.state.users.map(u => [u.username, u.isMaster])).toEqual([['mestre', false], ['ana', true]]);
    });

    it('vários touch() seguidos geram uma gravação só depois de 300 ms', () => {
        jest.useFakeTimers();
        const db = open();
        const flush = jest.spyOn(db, 'flush');
        db.touch(); db.touch(); db.touch();
        expect(flush).not.toHaveBeenCalled();
        jest.advanceTimersByTime(300);
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('flush grava de forma atômica: sem .tmp sobrando e o arquivo relido é igual ao state', () => {
        const db = open();
        db.state.map.name = 'Salvo';
        db.flush();
        expect(readdirSync(dir).filter(f => f.endsWith('.tmp'))).toEqual([]);
        expect(JSON.parse(readFileSync(file(), 'utf8'))).toEqual(db.state);
    });

    it('close() grava o que estava pendente no debounce', () => {
        jest.useFakeTimers();
        const db = open();
        db.state.map.name = 'Pendente';
        db.touch();
        db.close();
        expect(JSON.parse(readFileSync(file(), 'utf8')).map.name).toBe('Pendente');
    });
});
