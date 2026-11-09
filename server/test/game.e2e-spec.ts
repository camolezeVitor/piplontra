import { INestApplication } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Socket, io } from 'socket.io-client';
import { createApp } from '../src/main';

const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')}`;

describe('game (e2e)', () => {
    let dir: string;
    let app: INestApplication;
    let url: string;
    const sockets: Socket[] = [];

    async function start() {
        app = await createApp({ dataDir: dir, masters: ['mestre'], port: 0 });
        url = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    }

    /** Conecta e resolve com o snapshot; rejeita com a mensagem do connect_error. */
    function connect(auth: object): Promise<{ socket: Socket; snapshot: any }> {
        return new Promise((resolve, reject) => {
            const socket = io(url, { auth, autoConnect: false, reconnection: false, transports: ['websocket'] });
            sockets.push(socket);
            socket.once('state:snapshot', snapshot => resolve({ socket, snapshot }));
            socket.once('connect_error', err => reject(err));
            socket.connect();
        });
    }

    const next = (socket: Socket, event: string) => new Promise<any>(resolve => socket.once(event, resolve));
    const cmd = (socket: Socket, type: string, payload: object = {}) => socket.emitWithAck('cmd', { type, payload });

    beforeEach(async () => {
        dir = mkdtempSync(join(tmpdir(), 'pip-e2e-'));
        await start();
    });

    afterEach(async () => {
        sockets.splice(0).forEach(s => s.disconnect());
        await app.close();
        rmSync(dir, { recursive: true, force: true });
    });

    it('conexão sem credenciais é recusada com LOGIN INVÁLIDO', async () => {
        await expect(connect({})).rejects.toThrow('LOGIN INVÁLIDO');
    });

    it('register pelo handshake recebe state:snapshot com me, ainda sem personagem', async () => {
        const { snapshot } = await connect({ username: 'Ana', password: '1', register: true });
        expect(snapshot.me).toMatchObject({ username: 'ana', isMaster: false });
        expect(snapshot.me.password).toBeUndefined();
        expect(snapshot.players).toEqual([]);
        expect(snapshot.items.length).toBeGreaterThan(100);
        expect(snapshot.users.every((u: any) => u.password === undefined)).toBe(true);
    });

    it('outro cliente conectado recebe sync:users quando alguém se cadastra', async () => {
        const { socket: mestre } = await connect({ username: 'mestre', password: 'm', register: true });
        const synced = next(mestre, 'sync:users');
        await connect({ username: 'bia', password: '1', register: true });
        expect((await synced).map((u: any) => u.username)).toEqual(['mestre', 'bia']);
    });

    it('dois jogadores disputando o mesmo personagem: só um leva e todos veem o dono', async () => {
        const { socket: mestre } = await connect({ username: 'mestre', password: 'm', register: true });
        const { socket: ana, snapshot: sa } = await connect({ username: 'ana', password: '1', register: true });
        const { socket: bia } = await connect({ username: 'bia', password: '1', register: true });
        const added = next(bia, 'sync:players');
        await cmd(mestre, 'players:add', { player: { id: 'p-livre', label: 'Vault Dweller' } });
        await added;
        const synced = next(bia, 'sync:players');
        const [a, b] = await Promise.all([cmd(ana, 'players:claim', { playerId: 'p-livre' }), cmd(bia, 'players:claim', { playerId: 'p-livre' })]);
        expect([a, b]).toEqual([{ ok: true }, { ok: false, error: 'ESSE PERSONAGEM JÁ TEM DONO.' }]);
        expect((await synced).find((p: any) => p.id === 'p-livre').userId).toBe(sa.me.id);
    });

    it('turno: snapshot traz o turno, o mestre passa a vez, todos recebem sync:turn e só o jogador da vez age', async () => {
        const { socket: mestre, snapshot } = await connect({ username: 'mestre', password: 'm', register: true });
        expect(snapshot.turn).toEqual({ playerId: null, round: 1 });
        const { socket: ana } = await connect({ username: 'ana', password: '1', register: true });
        const { socket: bia } = await connect({ username: 'bia', password: '1', register: true });
        await cmd(ana, 'players:createOwn', { player: { id: 'p-ana', label: 'Ana' } });
        await cmd(bia, 'players:createOwn', { player: { id: 'p-bia', label: 'Bia' } });

        const synced = Promise.all([next(ana, 'sync:turn'), next(bia, 'sync:turn')]);
        await cmd(mestre, 'turn:set', { playerId: 'p-ana' });
        expect(await synced).toEqual([{ playerId: 'p-ana', round: 1 }, { playerId: 'p-ana', round: 1 }]);

        expect(await cmd(bia, 'players:allocateSpecial', { playerId: 'p-bia', stat: 'luck' })).toEqual({ ok: false, error: 'NÃO É O SEU TURNO.' });
        expect(await cmd(ana, 'turn:next')).toEqual({ ok: true });
        const pulse = next(mestre, 'fx:pulse');
        await cmd(bia, 'map:pulse', { x: 1, y: 1 });
        expect(await pulse).toMatchObject({ name: 'Bia' });
    });

    it('mestre manda quests:add e os dois clientes recebem sync:quests', async () => {
        const { socket: mestre } = await connect({ username: 'mestre', password: 'm', register: true });
        const { socket: ana } = await connect({ username: 'ana', password: '1', register: true });
        const both = Promise.all([next(mestre, 'sync:quests'), next(ana, 'sync:quests')]);
        expect(await cmd(mestre, 'quests:add', { quest: { id: 'q-new', label: 'NOVA' } })).toEqual({ ok: true });
        const [a, b] = await both;
        expect(a.map((q: any) => q.id)).toContain('q-new');
        expect(b).toEqual(a);
    });

    it('jogador manda quests:add, recebe ok:false e ninguém recebe sync', async () => {
        const { socket: ana } = await connect({ username: 'ana', password: '1', register: true });
        const spy = jest.fn();
        ana.on('sync:quests', spy);
        expect(await cmd(ana, 'quests:add', { quest: { id: 'x' } })).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
        await new Promise(r => setTimeout(r, 100));
        expect(spy).not.toHaveBeenCalled();
    });

    it('ack de players:useWeapon traz data.result', async () => {
        const { socket: ana, snapshot } = await connect({ username: 'ana', password: '1', register: true });
        const playerId = 'p-ana';
        await cmd(ana, 'players:createOwn', { player: { id: playerId, label: 'Ana' } });
        const pistol = snapshot.items.find((i: any) => i.label === '10mm Pistol');
        await cmd(ana, 'players:equipWeapon', { playerId, itemId: pistol.id });
        expect(await cmd(ana, 'players:useWeapon', { playerId })).toEqual({ ok: true, data: { result: 'no-ammo' } });
    });

    it('payload com data URL vira /uploads/... e GET dessa URL responde 200', async () => {
        const { socket: mestre } = await connect({ username: 'mestre', password: 'm', register: true });
        const synced = next(mestre, 'sync:map');
        await cmd(mestre, 'map:setBackground', { image: PNG });
        const map = await synced;
        expect(map.backgroundImage).toMatch(/^\/uploads\/.+\.png$/);
        const res = await fetch(url + map.backgroundImage);
        expect(res.status).toBe(200);
    });

    it('map:pulse chega como fx:pulse para todos', async () => {
        const { socket: mestre } = await connect({ username: 'mestre', password: 'm', register: true });
        const { socket: ana, snapshot } = await connect({ username: 'ana', password: '1', register: true });
        const received = next(mestre, 'fx:pulse');
        await cmd(ana, 'map:pulse', { x: 8, y: 24 });
        expect(await received).toEqual({ x: 8, y: 24, from: snapshot.me.id, name: 'ana', color: '#ffffff' });
    });

    it('reiniciar a app com o mesmo DATA_DIR mantém os dados', async () => {
        const { socket: mestre } = await connect({ username: 'mestre', password: 'm', register: true });
        await cmd(mestre, 'quests:add', { quest: { id: 'q-keep', label: 'FICA' } });
        sockets.splice(0).forEach(s => s.disconnect());
        await app.close();
        await start();
        const { snapshot } = await connect({ username: 'mestre', password: 'm' });
        expect(snapshot.quests.map((q: any) => q.id)).toContain('q-keep');
        expect(snapshot.me.isMaster).toBe(true);
    });
});
