import { TestBed } from '@angular/core/testing';
import { createPlayer } from '@shared/models/player';
import { RealtimeService } from '@shared/services/realtime.service';
import { TurnService } from '@shared/services/turn.service';

const ANA = { id: 'u-a', username: 'ana', nickname: 'Ana', avatar: null, color: '#fff', isMaster: false };
const MESTRE = { ...ANA, id: 'u-m', username: 'mestre', isMaster: true };

describe('TurnService', () => {
    let rt: RealtimeService;
    let send: jasmine.Spy;
    let turn: TurnService;
    const anaP = createPlayer({ id: 'p-a', label: 'Ana', userId: 'u-a' });
    const biaP = createPlayer({ id: 'p-b', label: 'Bia', userId: 'u-b' });

    beforeEach(() => {
        TestBed.configureTestingModule({});
        rt = TestBed.inject(RealtimeService);
        send = spyOn(rt, 'send');
        rt.players.set([anaP, biaP]);
        turn = TestBed.inject(TurnService);
    });

    it('applySync de turn atualiza o espelho', () => {
        rt.applySync('turn', { playerId: 'p-b', round: 3 });
        expect(turn.turn()).toEqual({ playerId: 'p-b', round: 3 });
        expect(turn.activePlayer()?.label).toBe('Bia');
        expect(turn.active()).toBeTrue();
    });

    it('sem turno ativo: modo exploração, ninguém está "no turno"', () => {
        rt.me.set(ANA);
        expect(turn.active()).toBeFalse();
        expect(turn.activePlayer()).toBeNull();
        expect(turn.isMyTurn()).toBeFalse();
    });

    it('isMyTurn quando o personagem no turno é do usuário logado', () => {
        rt.me.set(ANA);
        rt.turn.set({ playerId: 'p-a', round: 1 });
        expect(turn.isMyTurn()).toBeTrue();
        rt.turn.set({ playerId: 'p-b', round: 1 });
        expect(turn.isMyTurn()).toBeFalse();
    });

    it('canAct: jogador age no próprio personagem com turnos desligados ou na vez dele', () => {
        rt.me.set(ANA);
        expect(turn.canAct(anaP)).toBeTrue();
        rt.turn.set({ playerId: 'p-a', round: 1 });
        expect(turn.canAct(anaP)).toBeTrue();
        rt.turn.set({ playerId: 'p-b', round: 1 });
        expect(turn.canAct(anaP)).toBeFalse();
    });

    it('canAct: jogador nunca age no personagem dos outros; mestre age sempre', () => {
        rt.me.set(ANA);
        rt.turn.set({ playerId: 'p-b', round: 1 });
        expect(turn.canAct(biaP)).toBeFalse();
        expect(turn.canAct(null)).toBeFalse();
        rt.me.set(MESTRE);
        expect(turn.canAct(anaP)).toBeTrue();
        expect(turn.canAct(biaP)).toBeTrue();
    });

    it('canPass: o mestre passa sempre que há turno; o jogador só o dele', () => {
        rt.me.set(MESTRE);
        expect(turn.canPass()).toBeFalse();
        rt.turn.set({ playerId: 'p-b', round: 1 });
        expect(turn.canPass()).toBeTrue();
        rt.me.set(ANA);
        expect(turn.canPass()).toBeFalse();
        rt.turn.set({ playerId: 'p-a', round: 1 });
        expect(turn.canPass()).toBeTrue();
    });

    it('setTurn / next / end enviam os comandos', () => {
        turn.setTurn('p-b');
        turn.next();
        turn.end();
        expect(send.calls.allArgs()).toEqual([
            ['turn:set', { playerId: 'p-b' }],
            ['turn:next', {}],
            ['turn:end', {}],
        ]);
    });
});
