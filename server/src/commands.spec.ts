import { COMMANDS, SyncKey, execute } from './commands';
import { createMapObject } from './models';
import { makeState, master, pa, player, userA, userB } from './testing/fixtures';

describe('commands', () => {
    it('comando desconhecido retorna ok:false COMANDO DESCONHECIDO', () => {
        expect(execute(makeState(), master(), 'nada:aqui', {}).ack).toEqual({ ok: false, error: 'COMANDO DESCONHECIDO' });
    });

    it('jogador comum em comando de mestre recebe SÓ O MESTRE.', () => {
        const s = makeState();
        const { ack, sync } = execute(s, userA(), 'players:damage', { playerId: 'p-a', amount: 5 });
        expect(ack).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
        expect(sync).toEqual([]);
        expect(pa(s).hp).toBe(100);
    });

    it('dono executa comando owner no próprio player', () => {
        const s = makeState();
        expect(execute(s, userA(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack.ok).toBe(true);
        expect(pa(s).equippedWeaponId).toBe('i-pistol');
    });

    it('jogador em comando owner no player de outro recebe ESSE PERSONAGEM NÃO É SEU.', () => {
        const s = makeState();
        expect(execute(s, userB(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack)
            .toEqual({ ok: false, error: 'ESSE PERSONAGEM NÃO É SEU.' });
        expect(pa(s).equippedWeaponId).toBeNull();
    });

    it('mestre executa comando owner em qualquer player', () => {
        const s = makeState();
        expect(execute(s, master(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack.ok).toBe(true);
    });

    it('erro de regra vira ok:false com a mensagem e não muta o estado', () => {
        const s = makeState();
        const before = structuredClone(s);
        const { ack, sync } = execute(s, userA(), 'players:craft', { playerId: 'p-a', recipeId: 'r-ammo' });
        expect(ack).toEqual({ ok: false, error: 'FALTAM INSUMOS' });
        expect(sync).toEqual([]);
        expect(s).toEqual(before);
    });

    it('players:useWeapon devolve data.result', () => {
        const s = makeState({ players: [player({ equippedWeaponId: 'i-pistol' })] });
        expect(execute(s, userA(), 'players:useWeapon', { playerId: 'p-a' }).ack).toEqual({ ok: true, data: { result: 'no-ammo' } });
    });

    it('map:pulse é permitido a qualquer um, não sincroniza nada e devolve fx com nome e cor do personagem', () => {
        const s = makeState({ players: [player({ id: 'p-b', userId: 'u-b', label: 'Courier', color: '#ff5b5b' })] });
        const out = execute(s, userB(), 'map:pulse', { x: 1, y: 2 });
        expect(out.ack.ok).toBe(true);
        expect(out.sync).toEqual([]);
        expect(out.fx).toEqual({ event: 'fx:pulse', data: { x: 1, y: 2, from: 'u-b', name: 'Courier', color: '#ff5b5b' } });
    });

    it('pulse do mestre sai como MESTRE; de quem não tem personagem, com o apelido', () => {
        expect(execute(makeState(), master(), 'map:pulse', { x: 0, y: 0 }).fx?.data).toMatchObject({ name: 'MESTRE', color: '#ffffff' });
        expect(execute(makeState({ players: [] }), userB(), 'map:pulse', { x: 0, y: 0 }).fx?.data).toMatchObject({ name: 'Bia' });
    });

    describe('turnos', () => {
        const inTurn = (playerId: string | null) => {
            const s = makeState({ players: [player(), player({ id: 'p-b', userId: 'u-b' })] });
            s.turn.playerId = playerId;
            return s;
        };

        it('sem turno ativo o jogador age livre (exploração)', () => {
            expect(execute(inTurn(null), userA(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack.ok).toBe(true);
        });
        it('fora do turno dele o jogador recebe NÃO É O SEU TURNO. e nada muda', () => {
            const s = inTurn('p-b');
            expect(execute(s, userA(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack).toEqual({ ok: false, error: 'NÃO É O SEU TURNO.' });
            expect(pa(s).equippedWeaponId).toBeNull();
        });
        it('no turno dele o jogador age', () => {
            expect(execute(inTurn('p-a'), userA(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack.ok).toBe(true);
        });
        it('o mestre age mesmo fora do turno de qualquer um', () => {
            expect(execute(inTurn('p-b'), master(), 'players:equipWeapon', { playerId: 'p-a', itemId: 'i-pistol' }).ack.ok).toBe(true);
        });
        it('trocar de personagem e dar ping não dependem do turno', () => {
            const s = inTurn('p-b');
            s.players.push(player({ id: 'p-livre', userId: null }));
            expect(execute(s, userA(), 'map:pulse', { x: 0, y: 0 }).ack.ok).toBe(true);
            expect(execute(s, userA(), 'players:switch', { playerId: 'p-livre' }).ack.ok).toBe(true);
        });
        it('turn:set e turn:end são só do mestre', () => {
            const s = inTurn(null);
            expect(execute(s, userA(), 'turn:set', { playerId: 'p-a' }).ack).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
            expect(execute(s, master(), 'turn:set', { playerId: 'p-a' }).ack.ok).toBe(true);
            expect(execute(s, userA(), 'turn:end', {}).ack).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
            expect(execute(s, master(), 'turn:end', {}).ack.ok).toBe(true);
            expect(s.turn.playerId).toBeNull();
        });
        it('turn:next: o jogador da vez passa o próprio turno; outro jogador não', () => {
            const s = inTurn('p-a');
            expect(execute(s, userB(), 'turn:next', {}).ack).toEqual({ ok: false, error: 'NÃO É O SEU TURNO.' });
            expect(execute(s, userA(), 'turn:next', {}).ack.ok).toBe(true);
            expect(s.turn.playerId).toBe('p-b');
            expect(execute(s, master(), 'turn:next', {}).ack.ok).toBe(true);
            expect(s.turn).toEqual({ playerId: 'p-a', round: 2 });
        });
        it('turn:next sem turno ativo é só do mestre', () => {
            expect(execute(inTurn(null), userA(), 'turn:next', {}).ack).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
        });
        it('map:moveOwn: dono move o próprio token no turno dele; fora do turno não', () => {
            const s = inTurn('p-a');
            s.map.objects = [createMapObject({ id: 'tok', type: 'player', playerId: 'p-a' })];
            expect(execute(s, userA(), 'map:moveOwn', { playerId: 'p-a', objectId: 'tok', x: 3, y: 3 }).ack.ok).toBe(true);
            s.turn.playerId = 'p-b';
            expect(execute(s, userA(), 'map:moveOwn', { playerId: 'p-a', objectId: 'tok', x: 9, y: 9 }).ack).toEqual({ ok: false, error: 'NÃO É O SEU TURNO.' });
            expect(s.map.objects[0]).toMatchObject({ x: 3, y: 3 });
        });
    });

    it('me:update altera só o próprio usuário e ignora username/isMaster/password vazio', () => {
        const s = makeState();
        const me = s.users.find(u => u.id === 'u-a')!;
        execute(s, me, 'me:update', { nickname: 'Aninha', color: '#00ff00', username: 'hack', isMaster: true, password: '' });
        expect(me).toMatchObject({ nickname: 'Aninha', color: '#00ff00', username: 'ana', isMaster: false, password: '1' });
        expect(s.users.find(u => u.id === 'u-b')!.nickname).toBe('Bia');
        execute(s, me, 'me:update', { password: 'nova' });
        expect(me.password).toBe('nova');
    });

    it('players:add e quests:add com id duplicado recebem ID DUPLICADO', () => {
        const s = makeState();
        expect(execute(s, master(), 'players:add', { player: { id: 'p-a' } }).ack).toEqual({ ok: false, error: 'ID DUPLICADO' });
    });

    it('players:add completa os campos que faltam com os defaults', () => {
        const s = makeState();
        execute(s, master(), 'players:add', { player: { id: 'p-new', label: 'Novo' } });
        expect(pa(s, 'p-new')).toMatchObject({ label: 'Novo', hp: 100, level: 1, inventory: [], equippedApparel: {}, userId: null });
    });

    it('ajustes de HP/AP/XP são só do mestre', () => {
        const s = makeState();
        for (const type of ['players:adjustHp', 'players:adjustAp', 'players:adjustXp']) {
            expect(execute(s, userA(), type, { playerId: 'p-a', amount: 5 }).ack).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
        }
        expect(execute(s, master(), 'players:adjustHp', { playerId: 'p-a', amount: -30 }).ack.ok).toBe(true);
        expect(pa(s).hp).toBe(70);
    });

    it('players:removeItem do mestre desequipa o item removido', () => {
        const s = makeState({ players: [player({ equippedWeaponId: 'i-pistol', inventory: [{ itemId: 'i-pistol', quantity: 1 }] })] });
        execute(s, master(), 'players:removeItem', { playerId: 'p-a', itemId: 'i-pistol' });
        expect(pa(s).equippedWeaponId).toBeNull();
    });

    it('players:addItem de item inexistente recebe ITEM INEXISTENTE', () => {
        expect(execute(makeState(), master(), 'players:addItem', { playerId: 'p-a', itemId: 'zzz', quantity: 1 }).ack)
            .toEqual({ ok: false, error: 'ITEM INEXISTENTE' });
    });

    it('map:replace completa campos ausentes do mapa', () => {
        const s = makeState();
        execute(s, master(), 'map:replace', { map: { name: 'Novo', objects: [] } });
        expect(s.map).toEqual({ name: 'Novo', backgroundImage: null, objects: [], ambientLight: 100, effects: [], views: [] });
    });

    it('qualquer jogador pode escolher um personagem livre pra si (players:claim)', () => {
        const s = makeState({ players: [player({ id: 'p-livre', userId: null })] });
        expect(execute(s, userB(), 'players:claim', { playerId: 'p-livre' }).ack).toEqual({ ok: true });
        expect(pa(s, 'p-livre').userId).toBe('u-b');
    });

    it('dois jogadores escolhendo o mesmo personagem: só o primeiro leva', () => {
        const s = makeState({ players: [player({ id: 'p-livre', userId: null })], users: [master(), userA({ id: 'u-x' }), userB()] });
        expect(execute(s, s.users[1], 'players:claim', { playerId: 'p-livre' }).ack.ok).toBe(true);
        expect(execute(s, s.users[2], 'players:claim', { playerId: 'p-livre' }).ack).toEqual({ ok: false, error: 'ESSE PERSONAGEM JÁ TEM DONO.' });
    });

    it('players:switch troca o personagem do próprio jogador', () => {
        const s = makeState({ players: [player(), player({ id: 'p-livre', userId: null })] });
        expect(execute(s, userA(), 'players:switch', { playerId: 'p-livre' }).ack).toEqual({ ok: true });
        expect(pa(s, 'p-livre').userId).toBe('u-a');
        expect(pa(s).userId).toBeNull();
    });

    it('players:createOwn cria o personagem do próprio usuário', () => {
        const s = makeState({ players: [] });
        expect(execute(s, userB(), 'players:createOwn', { player: { id: 'p-b', label: 'Bia' } }).ack).toEqual({ ok: true });
        expect(pa(s, 'p-b').userId).toBe('u-b');
    });

    it('players:setSpecial é só do mestre', () => {
        const s = makeState();
        expect(execute(s, userA(), 'players:setSpecial', { playerId: 'p-a', stat: 'luck', value: 10 }).ack).toEqual({ ok: false, error: 'SÓ O MESTRE.' });
        expect(execute(s, master(), 'players:setSpecial', { playerId: 'p-a', stat: 'luck', value: 10 }).ack.ok).toBe(true);
        expect(pa(s).special.luck).toBe(10);
    });

    const SYNC: [string, SyncKey[]][] = [
        ['items:add', ['items']],
        ['items:update', ['items', 'recipes']],
        ['items:remove', ['items', 'players', 'loot', 'map']],
        ['recipes:add', ['recipes']],
        ['recipes:update', ['recipes']],
        ['recipes:remove', ['recipes']],
        ['quests:add', ['quests']],
        ['quests:update', ['quests']],
        ['quests:remove', ['quests']],
        ['players:add', ['players']],
        ['players:update', ['players']],
        ['players:remove', ['players', 'quests', 'turn']],
        ['players:damage', ['players']],
        ['players:spendAp', ['players']],
        ['players:adjustRads', ['players']],
        ['players:adjustCoins', ['players']],
        ['players:addXp', ['players']],
        ['players:adjustHp', ['players']],
        ['players:adjustAp', ['players']],
        ['players:adjustXp', ['players']],
        ['players:setImage', ['players']],
        ['players:addItem', ['players']],
        ['players:removeItem', ['players']],
        ['players:setItemQuantity', ['players']],
        ['players:equipWeapon', ['players']],
        ['players:equipApparel', ['players']],
        ['players:useAid', ['players']],
        ['players:useWeapon', ['players']],
        ['players:sell', ['players']],
        ['players:craft', ['players']],
        ['players:allocateSpecial', ['players']],
        ['players:choosePerk', ['players']],
        ['players:claim', ['players']],
        ['players:switch', ['players']],
        ['players:createOwn', ['players']],
        ['players:setSpecial', ['players']],
        ['players:setSpecialPoints', ['players']],
        ['loot:add', ['loot']],
        ['loot:addBatch', ['loot']],
        ['loot:remove', ['loot']],
        ['loot:claim', ['loot', 'players']],
        ['map:setName', ['map']],
        ['map:setAmbientLight', ['map']],
        ['map:toggleEffect', ['map']],
        ['map:setBackground', ['map']],
        ['map:addObject', ['map']],
        ['map:updateObject', ['map']],
        ['map:moveObjects', ['map']],
        ['map:removeObjects', ['map']],
        ['map:addView', ['map']],
        ['map:updateView', ['map']],
        ['map:removeView', ['map']],
        ['map:replace', ['map']],
        ['map:damageObject', ['map', 'loot']],
        ['map:pulse', []],
        ['map:moveOwn', ['map']],
        ['turn:set', ['turn']],
        ['turn:next', ['turn']],
        ['turn:end', ['turn']],
        ['me:update', ['users']],
        ['admin:importLegacy', ['items', 'quests', 'recipes', 'players', 'loot', 'map']],
    ];

    it.each(SYNC)('%s sincroniza %p', (type, keys) => {
        expect(COMMANDS[type]?.sync).toEqual(keys);
    });

    it('todo comando da tabela COMMANDS está no teste de sync', () => {
        expect(Object.keys(COMMANDS).sort()).toEqual(SYNC.map(([type]) => type).sort());
    });
});
