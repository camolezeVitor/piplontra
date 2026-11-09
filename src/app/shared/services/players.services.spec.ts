import { TestBed } from '@angular/core/testing';
import { createPlayer } from '@shared/models/player';
import { AdminService } from '@shared/services/admin.service';
import { ArmaSelecionadaUsuarioService } from '@shared/services/arma-selecionada-usuario.service';
import { PlayersService } from '@shared/services/players.service';
import { RealtimeService } from '@shared/services/realtime.service';
import { RoupaSelecionadaUsuarioService } from '@shared/services/roupa-selecionada-usuario.service';

const ME = { id: 'u-a', username: 'ana', nickname: 'Ana', avatar: null, color: '#fff', isMaster: false };

describe('services de jogador', () => {
    let rt: RealtimeService;
    let send: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        rt = TestBed.inject(RealtimeService);
        send = spyOn(rt, 'send');
        rt.players.set([
            createPlayer({ id: 'p-b', label: 'Bia', userId: 'u-b' }),
            createPlayer({ id: 'p-a', label: 'Ana', userId: 'u-a', equippedWeaponId: 'w', equippedApparel: { head: 'h' } }),
        ]);
    });

    describe('PlayersService', () => {
        it('me é o player cujo userId é o do usuário logado', () => {
            rt.me.set(ME);
            expect(TestBed.inject(PlayersService).me()?.id).toBe('p-a');
        });
        it('sem seleção explícita, selected é o próprio jogador', () => {
            rt.me.set(ME);
            expect(TestBed.inject(PlayersService).selected()?.id).toBe('p-a');
        });
        it('mestre (sem player) seleciona o primeiro da lista por padrão', () => {
            rt.me.set({ ...ME, id: 'u-m', isMaster: true });
            expect(TestBed.inject(PlayersService).selected()?.id).toBe('p-b');
        });
        it('mestre: select troca a seleção; selecionar um id removido volta pro padrão', () => {
            rt.me.set({ ...ME, id: 'u-m', isMaster: true });
            const players = TestBed.inject(PlayersService);
            players.select('p-a');
            expect(players.selectedId()).toBe('p-a');
            rt.players.set([rt.players()[0]]);
            expect(players.selectedId()).toBe('p-b');
        });
        it('jogador: selected é sempre o próprio personagem — selecionar outro é ignorado', () => {
            rt.me.set(ME);
            const players = TestBed.inject(PlayersService);
            players.select('p-b');
            expect(players.selectedId()).toBe('p-a');
        });
        it('jogador sem personagem não tem ninguém selecionado', () => {
            rt.me.set({ ...ME, id: 'u-sem' });
            expect(TestBed.inject(PlayersService).selected()).toBeNull();
        });
        it('canSelect: mestre seleciona qualquer um; jogador só o próprio', () => {
            const players = TestBed.inject(PlayersService);
            const [bia, ana] = rt.players();
            rt.me.set(ME);
            expect(players.canSelect(ana)).toBeTrue();
            expect(players.canSelect(bia)).toBeFalse();
            rt.me.set({ ...ME, isMaster: true });
            expect(players.canSelect(bia)).toBeTrue();
        });
        it('switchTo pede a troca ao servidor e espera a resposta (pra fechar a janela só se deu certo)', async () => {
            const command = spyOn(rt, 'command').and.resolveTo(undefined);
            await TestBed.inject(PlayersService).switchTo('p-livre');
            expect(command).toHaveBeenCalledWith('players:switch', { playerId: 'p-livre' });
        });
        it('freePlayers lista só os personagens sem dono', () => {
            rt.players.set([...rt.players(), createPlayer({ id: 'p-livre', userId: null })]);
            expect(TestBed.inject(PlayersService).freePlayers().map(p => p.id)).toEqual(['p-livre']);
        });
        it('claim, createOwn, setSpecial e setSpecialPoints enviam os comandos', () => {
            const players = TestBed.inject(PlayersService);
            players.claim('p-livre');
            const own = players.createOwn('Meu Herói');
            players.setSpecial('p-a', 'agility', 9);
            players.setSpecialPoints('p-a', 2);
            expect(own.label).toBe('Meu Herói');
            expect(send.calls.allArgs()).toEqual([
                ['players:claim', { playerId: 'p-livre' }],
                ['players:createOwn', { player: own }],
                ['players:setSpecial', { playerId: 'p-a', stat: 'agility', value: 9 }],
                ['players:setSpecialPoints', { playerId: 'p-a', value: 2 }],
            ]);
        });
        it('mutadores enviam os comandos com playerId', async () => {
            const players = TestBed.inject(PlayersService);
            players.updatePlayer('p-a', { label: 'X' });
            players.damagePlayer('p-a', 5);
            players.spendAp('p-a', 2);
            players.adjustRads('p-a', -3);
            players.adjustCoins('p-a', 7);
            players.addXp('p-a', 50);
            players.allocateSpecialPoint('p-a', 'luck');
            players.choosePerk('p-a', 'medic');
            players.addItem('p-a', 'i', 2);
            players.removeItem('p-a', 'i');
            players.setItemQuantity('p-a', 'i', 4);
            players.useAidItem('p-a', 'i');
            players.sellItem('p-a', 'i', 1);
            players.craft('p-a', { id: 'r', label: '', icon: '', inputs: [], outputs: [] });
            players.removePlayer('p-a');
            expect(send.calls.allArgs()).toEqual([
                ['players:update', { playerId: 'p-a', changes: { label: 'X' } }],
                ['players:damage', { playerId: 'p-a', amount: 5 }],
                ['players:spendAp', { playerId: 'p-a', amount: 2 }],
                ['players:adjustRads', { playerId: 'p-a', amount: -3 }],
                ['players:adjustCoins', { playerId: 'p-a', amount: 7 }],
                ['players:addXp', { playerId: 'p-a', amount: 50 }],
                ['players:allocateSpecial', { playerId: 'p-a', stat: 'luck' }],
                ['players:choosePerk', { playerId: 'p-a', perkId: 'medic' }],
                ['players:addItem', { playerId: 'p-a', itemId: 'i', quantity: 2 }],
                ['players:removeItem', { playerId: 'p-a', itemId: 'i' }],
                ['players:setItemQuantity', { playerId: 'p-a', itemId: 'i', quantity: 4 }],
                ['players:useAid', { playerId: 'p-a', itemId: 'i' }],
                ['players:sell', { playerId: 'p-a', itemId: 'i', quantity: 1 }],
                ['players:craft', { playerId: 'p-a', recipeId: 'r' }],
                ['players:remove', { playerId: 'p-a' }],
            ]);
        });
        it('adjustHp / adjustAp / adjustXp enviam o valor com sinal', () => {
            const players = TestBed.inject(PlayersService);
            players.adjustHp('p-a', 15);
            players.adjustAp('p-a', -10);
            players.adjustXp('p-a', -20);
            expect(send.calls.allArgs()).toEqual([
                ['players:adjustHp', { playerId: 'p-a', amount: 15 }],
                ['players:adjustAp', { playerId: 'p-a', amount: -10 }],
                ['players:adjustXp', { playerId: 'p-a', amount: -20 }],
            ]);
        });
        it('addPlayer cria no cliente e envia players:add', () => {
            const player = TestBed.inject(PlayersService).addPlayer({ label: 'Novo' });
            expect(send).toHaveBeenCalledWith('players:add', { player });
        });
        it('useWeapon pergunta ao servidor e devolve o resultado', async () => {
            spyOn(rt, 'command').and.resolveTo({ result: 'no-ammo' });
            await expectAsync(TestBed.inject(PlayersService).useWeapon('p-a')).toBeResolvedTo('no-ammo');
            expect(rt.command).toHaveBeenCalledWith('players:useWeapon', { playerId: 'p-a' });
        });
    });

    describe('ArmaSelecionadaUsuarioService (derivado de Player.equippedWeaponId)', () => {
        it('armaDoUsuario lê do player', () => {
            const arma = TestBed.inject(ArmaSelecionadaUsuarioService);
            expect(arma.armaDoUsuario('p-a')).toBe('w');
            expect(arma.armaDoUsuario('p-b')).toBeUndefined();
        });
        it('selecionar e limpar enviam players:equipWeapon', () => {
            const arma = TestBed.inject(ArmaSelecionadaUsuarioService);
            arma.selecionar('p-b', 'x');
            arma.limpar('p-a');
            expect(send.calls.allArgs()).toEqual([
                ['players:equipWeapon', { playerId: 'p-b', itemId: 'x' }],
                ['players:equipWeapon', { playerId: 'p-a', itemId: null }],
            ]);
        });
    });

    describe('RoupaSelecionadaUsuarioService (derivado de Player.equippedApparel)', () => {
        it('equipadoNoSlot e equipamentos leem do player', () => {
            const roupa = TestBed.inject(RoupaSelecionadaUsuarioService);
            expect(roupa.equipadoNoSlot('p-a', 'head')).toBe('h');
            expect(roupa.equipamentos('p-b')).toEqual({});
        });
        it('selecionar e desequipar enviam players:equipApparel', () => {
            const roupa = TestBed.inject(RoupaSelecionadaUsuarioService);
            roupa.selecionar('p-a', 'chest', 'c');
            roupa.desequipar('p-a', 'head');
            expect(send.calls.allArgs()).toEqual([
                ['players:equipApparel', { playerId: 'p-a', slot: 'chest', itemId: 'c' }],
                ['players:equipApparel', { playerId: 'p-a', slot: 'head', itemId: null }],
            ]);
        });
    });

    describe('AdminService', () => {
        it('isAdmin vem de me.isMaster', () => {
            const admin = TestBed.inject(AdminService);
            expect(admin.isAdmin()).toBeFalse();
            rt.me.set({ ...ME, isMaster: true });
            expect(admin.isAdmin()).toBeTrue();
        });
    });
});
