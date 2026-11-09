import { TestBed } from '@angular/core/testing';
import { createEmptyGameMap } from '@shared/models/game-map';
import { Snapshot } from '@shared/models/user';
import { RealtimeService } from '@shared/services/realtime.service';

const ME = { id: 'u-a', username: 'ana', nickname: 'Ana', avatar: null, color: '#fff', isMaster: false };

function snapshot(partial: Partial<Snapshot> = {}): Snapshot {
    return { me: ME, users: [ME], items: [], quests: [], recipes: [], players: [], loot: [], map: createEmptyGameMap(), turn: { playerId: null, round: 1 }, ...partial };
}

/** Socket falso: só o que o RealtimeService usa pra mandar comandos. */
function fakeSocket(ack: unknown) {
    const emitWithAck = jasmine.createSpy('emitWithAck').and.resolveTo(ack);
    return { emitWithAck, timeout: () => ({ emitWithAck }) };
}

describe('RealtimeService', () => {
    let rt: RealtimeService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        rt = TestBed.inject(RealtimeService);
    });

    it('applySnapshot preenche me, users e todas as coleções', () => {
        const quest = { id: 'q', label: 'Q', location: '', objective: '', progress: '', status: 'ACTIVE' as const, playerIds: [] };
        rt.applySnapshot(snapshot({ quests: [quest] }));
        expect(rt.me()).toEqual(ME);
        expect(rt.users()).toEqual([ME]);
        expect(rt.quests()).toEqual([quest]);
        expect(rt.map()).toEqual(createEmptyGameMap());
    });

    it('applySync troca só a coleção indicada', () => {
        rt.applySnapshot(snapshot());
        rt.applySync('loot', [{ id: 'l', itemId: 'i', quantity: 1, source: '' }]);
        expect(rt.loot().length).toBe(1);
        expect(rt.items()).toEqual([]);
    });

    it('applySync de users atualiza o me pelo id', () => {
        rt.applySnapshot(snapshot());
        rt.applySync('users', [{ ...ME, nickname: 'Aninha' }]);
        expect(rt.me()?.nickname).toBe('Aninha');
    });

    it('command manda { type, payload } no evento cmd e resolve com data', async () => {
        const socket = fakeSocket({ ok: true, data: { result: 'fired' } });
        (rt as any).socket = socket;
        await expectAsync(rt.command('players:useWeapon', { playerId: 'p' })).toBeResolvedTo({ result: 'fired' });
        expect(socket.emitWithAck).toHaveBeenCalledWith('cmd', { type: 'players:useWeapon', payload: { playerId: 'p' } });
    });

    it('command com ok:false rejeita com a mensagem e preenche error', async () => {
        (rt as any).socket = fakeSocket({ ok: false, error: 'SÓ O MESTRE.' });
        await expectAsync(rt.command('quests:add', {})).toBeRejectedWithError('SÓ O MESTRE.');
        expect(rt.error()).toBe('SÓ O MESTRE.');
    });

    it('command sem conexão rejeita com SEM CONEXÃO', async () => {
        await expectAsync(rt.command('quests:add', {})).toBeRejectedWithError('SEM CONEXÃO.');
    });

    it('send não propaga o erro (só preenche error)', async () => {
        (rt as any).socket = fakeSocket({ ok: false, error: 'FALTAM INSUMOS' });
        rt.send('players:craft', {});
        await new Promise(r => setTimeout(r));
        expect(rt.error()).toBe('FALTAM INSUMOS');
    });

    it('on recebe eventos efêmeros despachados', () => {
        const handler = jasmine.createSpy('handler');
        rt.on('fx:pulse', handler);
        rt.dispatch('fx:pulse', { x: 1, y: 2 });
        expect(handler).toHaveBeenCalledWith({ x: 1, y: 2 });
    });

    it('disconnect limpa a sessão (me volta a null)', () => {
        rt.applySnapshot(snapshot());
        rt.disconnect();
        expect(rt.me()).toBeNull();
    });
});
