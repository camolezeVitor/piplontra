import * as rules from './rules';
import { createMapObject } from './models';
import { inv, makeState, master, pa, player, userA, userB } from './testing/fixtures';

describe('rules', () => {
    describe('patchById', () => {
        it('patchById mescla changes e nunca troca o id', () => {
            const list = [{ id: 'a', n: 1 }];
            rules.patchById(list, 'a', { id: 'x', n: 2 });
            expect(list).toEqual([{ id: 'a', n: 2 }]);
        });
        it('patchById de item preserva category', () => {
            const s = makeState();
            rules.patchById(s.items, 'i-pistol', { category: 'junk', damage: 99 } as any, ['category']);
            expect(s.items[0]).toMatchObject({ category: 'weapon', damage: 99 });
        });
        it('patchById lança NÃO ENCONTRADO para id inexistente', () => {
            expect(() => rules.patchById([{ id: 'a' }], 'b', {})).toThrow('NÃO ENCONTRADO');
        });
    });

    describe('inventário', () => {
        it('addToInventory soma na pilha existente', () => {
            const p = player({ inventory: [{ itemId: 'i-10mm', quantity: 5 }] });
            rules.addToInventory(p, 'i-10mm', 3);
            expect(p.inventory).toEqual([{ itemId: 'i-10mm', quantity: 8 }]);
        });
        it('addToInventory cria pilha nova quando não existe', () => {
            const p = player();
            rules.addToInventory(p, 'i-10mm', 3);
            expect(p.inventory).toEqual([{ itemId: 'i-10mm', quantity: 3 }]);
        });
        it('setItemQuantity com 0 ou negativo remove a pilha', () => {
            const p = player({ inventory: [{ itemId: 'i-10mm', quantity: 5 }, { itemId: 'i-can', quantity: 1 }] });
            rules.setItemQuantity(p, 'i-10mm', 0);
            rules.setItemQuantity(p, 'i-can', -2);
            expect(p.inventory).toEqual([]);
        });
        it('removeFromInventory tira a pilha inteira', () => {
            const p = player({ inventory: [{ itemId: 'i-10mm', quantity: 5 }] });
            rules.removeFromInventory(p, 'i-10mm');
            expect(p.inventory).toEqual([]);
        });
    });

    describe('atributos ajustáveis pelo mestre', () => {
        it('damage reduz hp e nunca deixa negativo', () => {
            const s = makeState({ players: [player({ hp: 30 })] });
            rules.damage(s, 'p-a', 10);
            expect(pa(s).hp).toBe(20);
            rules.damage(s, 'p-a', 999);
            expect(pa(s).hp).toBe(0);
        });
        it('damage com amount <= 0 não faz nada', () => {
            const s = makeState({ players: [player({ hp: 30 })] });
            rules.damage(s, 'p-a', 0);
            rules.damage(s, 'p-a', -5);
            expect(pa(s).hp).toBe(30);
        });
        it('spendAp reduz ap com piso 0', () => {
            const s = makeState({ players: [player({ ap: 10 })] });
            rules.spendAp(s, 'p-a', 4);
            expect(pa(s).ap).toBe(6);
            rules.spendAp(s, 'p-a', 100);
            expect(pa(s).ap).toBe(0);
        });
        it('adjustRads aceita negativo e tem piso 0', () => {
            const s = makeState({ players: [player({ rads: 10 })] });
            rules.adjustRads(s, 'p-a', 15);
            expect(pa(s).rads).toBe(25);
            rules.adjustRads(s, 'p-a', -100);
            expect(pa(s).rads).toBe(0);
        });
        it('adjustCoins aceita negativo e tem piso 0', () => {
            const s = makeState({ players: [player({ coins: 10 })] });
            rules.adjustCoins(s, 'p-a', 5);
            expect(pa(s).coins).toBe(15);
            rules.adjustCoins(s, 'p-a', -100);
            expect(pa(s).coins).toBe(0);
        });
    });

    describe('ajustes ± do mestre', () => {
        it('adjustHp cura e dá dano, limitado a 0..maxHp', () => {
            const s = makeState({ players: [player({ hp: 50, maxHp: 100 })] });
            rules.adjustHp(s, 'p-a', 30);
            expect(pa(s).hp).toBe(80);
            rules.adjustHp(s, 'p-a', 999);
            expect(pa(s).hp).toBe(100);
            rules.adjustHp(s, 'p-a', -150);
            expect(pa(s).hp).toBe(0);
        });
        it('adjustAp recupera e gasta AP, limitado a 0..maxAp', () => {
            const s = makeState({ players: [player({ ap: 10, maxAp: 100 })] });
            rules.adjustAp(s, 'p-a', 25);
            expect(pa(s).ap).toBe(35);
            rules.adjustAp(s, 'p-a', 500);
            expect(pa(s).ap).toBe(100);
            rules.adjustAp(s, 'p-a', -500);
            expect(pa(s).ap).toBe(0);
        });
        it('adjustXp positivo sobe de nível igual ao addXp', () => {
            const s = makeState();
            rules.adjustXp(s, 'p-a', 150);
            expect(pa(s)).toMatchObject({ level: 2, xp: 50 });
        });
        it('adjustXp negativo tira XP do nível atual sem rebaixar o nível', () => {
            const s = makeState({ players: [player({ level: 3, xp: 40 })] });
            rules.adjustXp(s, 'p-a', -25);
            expect(pa(s)).toMatchObject({ level: 3, xp: 15 });
            rules.adjustXp(s, 'p-a', -999);
            expect(pa(s)).toMatchObject({ level: 3, xp: 0 });
        });
        it('remover do inventário o item equipado desequipa (arma e roupa)', () => {
            const s = makeState({ players: [player({
                equippedWeaponId: 'i-pistol', equippedApparel: { head: 'i-helmet' },
                inventory: [{ itemId: 'i-pistol', quantity: 1 }, { itemId: 'i-helmet', quantity: 2 }],
            })] });
            rules.removeFromPlayer(s, 'p-a', 'i-pistol');
            expect(pa(s).equippedWeaponId).toBeNull();
            rules.setPlayerItemQuantity(s, 'p-a', 'i-helmet', 1);
            expect(pa(s).equippedApparel).toEqual({ head: 'i-helmet' });
            rules.setPlayerItemQuantity(s, 'p-a', 'i-helmet', 0);
            expect(pa(s).equippedApparel).toEqual({});
            expect(inv(s)).toEqual({});
        });
    });

    describe('XP e progressão', () => {
        it('addXp abaixo do necessário só acumula', () => {
            const s = makeState();
            rules.addXp(s, 'p-a', 50);
            expect(pa(s)).toMatchObject({ level: 1, xp: 50, specialPoints: 0, perkPoints: 0 });
        });
        it('addXp exato sobe 1 nível e dá 1 ponto de SPECIAL e 1 de perk', () => {
            const s = makeState();
            rules.addXp(s, 'p-a', 100);
            expect(pa(s)).toMatchObject({ level: 2, xp: 0, specialPoints: 1, perkPoints: 1 });
        });
        it('addXp grande sobe vários níveis e guarda o resto', () => {
            const s = makeState();
            rules.addXp(s, 'p-a', 350);
            expect(pa(s)).toMatchObject({ level: 3, xp: 50, specialPoints: 2, perkPoints: 2 });
        });
        it('allocateSpecial sem ponto lança SEM PONTOS DE SPECIAL', () => {
            const s = makeState();
            expect(() => rules.allocateSpecial(s, 'p-a', 'strength')).toThrow('SEM PONTOS DE SPECIAL');
        });
        it('allocateSpecial gasta 1 ponto e soma 1 no atributo', () => {
            const s = makeState({ players: [player({ specialPoints: 1 })] });
            rules.allocateSpecial(s, 'p-a', 'strength');
            expect(pa(s).specialPoints).toBe(0);
            expect(pa(s).special.strength).toBe(6);
        });
        it('choosePerk sem ponto lança SEM PONTOS DE PERK', () => {
            const s = makeState();
            expect(() => rules.choosePerk(s, 'p-a', 'toughness')).toThrow('SEM PONTOS DE PERK');
        });
        it('choosePerk de perk inexistente lança PERK INEXISTENTE', () => {
            const s = makeState({ players: [player({ perkPoints: 1 })] });
            expect(() => rules.choosePerk(s, 'p-a', 'nao-existe')).toThrow('PERK INEXISTENTE');
        });
        it('choosePerk no rank máximo lança RANK MÁXIMO', () => {
            const s = makeState({ players: [player({ perkPoints: 1, perkRanks: { toughness: 3 } })] });
            expect(() => rules.choosePerk(s, 'p-a', 'toughness')).toThrow('RANK MÁXIMO');
        });
        it('choosePerk gasta 1 ponto e sobe o rank', () => {
            const s = makeState({ players: [player({ perkPoints: 2, perkRanks: { toughness: 1 } })] });
            rules.choosePerk(s, 'p-a', 'toughness');
            rules.choosePerk(s, 'p-a', 'medic');
            expect(pa(s).perkPoints).toBe(0);
            expect(pa(s).perkRanks).toEqual({ toughness: 2, medic: 1 });
        });
    });

    describe('escolha de personagem', () => {
        const free = () => player({ id: 'p-livre', label: 'Livre', userId: null });

        it('claimPlayer de personagem sem dono vincula ao usuário', () => {
            const s = makeState({ players: [free()] });
            rules.claimPlayer(s, userB(), 'p-livre');
            expect(pa(s, 'p-livre').userId).toBe('u-b');
        });
        it('claimPlayer de personagem com outro dono lança ESSE PERSONAGEM JÁ TEM DONO.', () => {
            const s = makeState();
            expect(() => rules.claimPlayer(s, userB(), 'p-a')).toThrow('ESSE PERSONAGEM JÁ TEM DONO.');
            expect(pa(s).userId).toBe('u-a');
        });
        it('claimPlayer quando o usuário já tem personagem lança VOCÊ JÁ TEM UM PERSONAGEM.', () => {
            const s = makeState({ players: [player(), free()] });
            expect(() => rules.claimPlayer(s, userA(), 'p-livre')).toThrow('VOCÊ JÁ TEM UM PERSONAGEM.');
        });
        it('claimPlayer do próprio personagem não faz nada (idempotente)', () => {
            const s = makeState();
            rules.claimPlayer(s, userA(), 'p-a');
            expect(pa(s).userId).toBe('u-a');
        });
        it('claimPlayer pelo mestre lança O MESTRE NÃO TEM PERSONAGEM.', () => {
            const s = makeState({ players: [free()] });
            expect(() => rules.claimPlayer(s, master(), 'p-livre')).toThrow('O MESTRE NÃO TEM PERSONAGEM.');
        });
        it('createOwnPlayer cria personagem vinculado, com o nickname se o nome vier vazio', () => {
            const s = makeState({ players: [] });
            rules.createOwnPlayer(s, userB(), { id: 'p-novo', label: '  ' });
            expect(pa(s, 'p-novo')).toMatchObject({ userId: 'u-b', label: 'Bia', hp: 100, level: 1 });
        });
        it('createOwnPlayer quando já tem personagem lança VOCÊ JÁ TEM UM PERSONAGEM.', () => {
            const s = makeState();
            expect(() => rules.createOwnPlayer(s, userA(), { id: 'p-x', label: 'X' })).toThrow('VOCÊ JÁ TEM UM PERSONAGEM.');
        });
        it('createOwnPlayer pelo mestre lança O MESTRE NÃO TEM PERSONAGEM.', () => {
            expect(() => rules.createOwnPlayer(makeState(), master(), { id: 'p-x', label: 'X' })).toThrow('O MESTRE NÃO TEM PERSONAGEM.');
        });
    });

    describe('turnos', () => {
        const three = () => makeState({ players: [player({ id: 'p1', userId: 'u-a' }), player({ id: 'p2', userId: 'u-b' }), player({ id: 'p3', userId: null })] });

        it('setTurn põe o personagem no turno', () => {
            const s = three();
            rules.setTurn(s, 'p2');
            expect(s.turn).toEqual({ playerId: 'p2', round: 1 });
        });
        it('setTurn de personagem inexistente lança JOGADOR NÃO ENCONTRADO', () => {
            expect(() => rules.setTurn(three(), 'zzz')).toThrow('JOGADOR NÃO ENCONTRADO');
        });
        it('nextTurn sem turno ativo começa pelo primeiro da lista', () => {
            const s = three();
            rules.nextTurn(s);
            expect(s.turn).toEqual({ playerId: 'p1', round: 1 });
        });
        it('nextTurn segue a ordem da lista', () => {
            const s = three();
            rules.setTurn(s, 'p1');
            rules.nextTurn(s);
            expect(s.turn.playerId).toBe('p2');
        });
        it('nextTurn no último volta pro primeiro e sobe a rodada', () => {
            const s = three();
            rules.setTurn(s, 'p3');
            rules.nextTurn(s);
            expect(s.turn).toEqual({ playerId: 'p1', round: 2 });
        });
        it('nextTurn sem personagens lança NINGUÉM PRA JOGAR', () => {
            expect(() => rules.nextTurn(makeState({ players: [] }))).toThrow('NINGUÉM PRA JOGAR');
        });
        it('endTurns desliga os turnos e zera a rodada', () => {
            const s = three();
            rules.setTurn(s, 'p2');
            s.turn.round = 4;
            rules.endTurns(s);
            expect(s.turn).toEqual({ playerId: null, round: 1 });
        });
        it('removePlayer do personagem no turno desliga os turnos', () => {
            const s = three();
            rules.setTurn(s, 'p2');
            rules.removePlayer(s, 'p2');
            expect(s.turn.playerId).toBeNull();
        });
    });

    describe('mover o próprio personagem no mapa', () => {
        const withToken = () => {
            const s = makeState();
            s.map.objects = [createMapObject({ id: 'tok', type: 'player', playerId: 'p-a', x: 1, y: 1 }), createMapObject({ id: 'bau', x: 5, y: 5 })];
            return s;
        };
        it('moveOwnToken move o objeto do próprio personagem', () => {
            const s = withToken();
            rules.moveOwnToken(s, 'p-a', 'tok', 4, 7);
            expect(s.map.objects[0]).toMatchObject({ x: 4, y: 7 });
        });
        it('moveOwnToken de objeto que não é do personagem lança ESSE OBJETO NÃO É SEU.', () => {
            const s = withToken();
            expect(() => rules.moveOwnToken(s, 'p-a', 'bau', 0, 0)).toThrow('ESSE OBJETO NÃO É SEU.');
            expect(s.map.objects[1]).toMatchObject({ x: 5, y: 5 });
        });
        it('moveOwnToken arredonda pra célula inteira', () => {
            const s = withToken();
            rules.moveOwnToken(s, 'p-a', 'tok', 2.4, 3.6);
            expect(s.map.objects[0]).toMatchObject({ x: 2, y: 4 });
        });
    });

    describe('trocar de personagem', () => {
        const free = () => player({ id: 'p-livre', label: 'Livre', userId: null });

        it('switchPlayer solta o atual e assume o novo', () => {
            const s = makeState({ players: [player(), free()] });
            rules.switchPlayer(s, userA(), 'p-livre');
            expect(pa(s, 'p-livre').userId).toBe('u-a');
            expect(pa(s, 'p-a').userId).toBeNull();
        });
        it('switchPlayer pra um personagem com dono lança ESSE PERSONAGEM JÁ TEM DONO. e não solta o atual', () => {
            const s = makeState({ players: [player(), player({ id: 'p-b', userId: 'u-b' })] });
            const before = structuredClone(s);
            expect(() => rules.switchPlayer(s, userA(), 'p-b')).toThrow('ESSE PERSONAGEM JÁ TEM DONO.');
            expect(s).toEqual(before);
        });
        it('switchPlayer sem personagem atual funciona como escolher', () => {
            const s = makeState({ players: [free()] });
            rules.switchPlayer(s, userB(), 'p-livre');
            expect(pa(s, 'p-livre').userId).toBe('u-b');
        });
        it('switchPlayer pro próprio personagem não faz nada', () => {
            const s = makeState();
            rules.switchPlayer(s, userA(), 'p-a');
            expect(pa(s).userId).toBe('u-a');
        });
        it('switchPlayer pelo mestre lança O MESTRE NÃO TEM PERSONAGEM.', () => {
            expect(() => rules.switchPlayer(makeState({ players: [free()] }), master(), 'p-livre')).toThrow('O MESTRE NÃO TEM PERSONAGEM.');
        });
    });

    describe('SPECIAL definido pelo mestre', () => {
        it('setSpecial define o valor do atributo', () => {
            const s = makeState();
            rules.setSpecial(s, 'p-a', 'agility', 8);
            expect(pa(s).special.agility).toBe(8);
            expect(pa(s).special.strength).toBe(5);
        });
        it('setSpecial limita a 1..10 e arredonda', () => {
            const s = makeState();
            rules.setSpecial(s, 'p-a', 'luck', 99);
            expect(pa(s).special.luck).toBe(10);
            rules.setSpecial(s, 'p-a', 'luck', -3);
            expect(pa(s).special.luck).toBe(1);
            rules.setSpecial(s, 'p-a', 'luck', 6.6);
            expect(pa(s).special.luck).toBe(7);
        });
        it('setSpecial de atributo inválido lança ATRIBUTO INVÁLIDO', () => {
            expect(() => rules.setSpecial(makeState(), 'p-a', 'magia' as any, 5)).toThrow('ATRIBUTO INVÁLIDO');
        });
        it('setSpecialPoints define os pontos livres com piso 0', () => {
            const s = makeState();
            rules.setSpecialPoints(s, 'p-a', 3);
            expect(pa(s).specialPoints).toBe(3);
            rules.setSpecialPoints(s, 'p-a', -1);
            expect(pa(s).specialPoints).toBe(0);
        });
    });

    describe('equipar', () => {
        it('equipWeapon seta e null desequipa', () => {
            const s = makeState();
            rules.equipWeapon(s, 'p-a', 'i-pistol');
            expect(pa(s).equippedWeaponId).toBe('i-pistol');
            rules.equipWeapon(s, 'p-a', null);
            expect(pa(s).equippedWeaponId).toBeNull();
        });
        it('equipApparel substitui o item do mesmo slot', () => {
            const s = makeState({ players: [player({ equippedApparel: { head: 'old', chest: 'c' } })] });
            rules.equipApparel(s, 'p-a', 'head', 'i-helmet');
            expect(pa(s).equippedApparel).toEqual({ head: 'i-helmet', chest: 'c' });
        });
        it('equipApparel com null desequipa só aquele slot', () => {
            const s = makeState({ players: [player({ equippedApparel: { head: 'i-helmet', chest: 'c' } })] });
            rules.equipApparel(s, 'p-a', 'head', null);
            expect(pa(s).equippedApparel).toEqual({ chest: 'c' });
        });
    });

    describe('usar / vender / craftar', () => {
        it('useAid de item que não é aid lança ITEM INVÁLIDO', () => {
            const s = makeState({ players: [player({ inventory: [{ itemId: 'i-can', quantity: 1 }] })] });
            expect(() => rules.useAid(s, 'p-a', 'i-can')).toThrow('ITEM INVÁLIDO');
        });
        it('useAid sem estoque lança SEM ESTOQUE', () => {
            const s = makeState();
            expect(() => rules.useAid(s, 'p-a', 'i-stim')).toThrow('SEM ESTOQUE');
        });
        it('useAid cura sem passar do maxHp e consome 1', () => {
            const s = makeState({ players: [player({ hp: 90, maxHp: 100, inventory: [{ itemId: 'i-stim', quantity: 2 }] })] });
            rules.useAid(s, 'p-a', 'i-stim');
            expect(pa(s).hp).toBe(100);
            expect(inv(s)).toEqual({ 'i-stim': 1 });
        });
        it('useAid de RadAway reduz rads com piso 0', () => {
            const s = makeState({ players: [player({ rads: 120, inventory: [{ itemId: 'i-rad', quantity: 1 }] })] });
            rules.useAid(s, 'p-a', 'i-rad');
            expect(pa(s).rads).toBe(0);
        });
        it('useAid da última unidade remove a pilha', () => {
            const s = makeState({ players: [player({ inventory: [{ itemId: 'i-stim', quantity: 1 }] })] });
            rules.useAid(s, 'p-a', 'i-stim');
            expect(inv(s)).toEqual({});
        });
        it('useWeapon sem arma equipada lança NENHUMA ARMA EQUIPADA', () => {
            const s = makeState();
            expect(() => rules.useWeapon(s, 'p-a')).toThrow('NENHUMA ARMA EQUIPADA');
        });
        it('useWeapon de arma sem munição rastreada retorna fired e não gasta nada', () => {
            const s = makeState({ players: [player({ equippedWeaponId: 'i-knife', inventory: [{ itemId: 'i-10mm', quantity: 3 }] })] });
            expect(rules.useWeapon(s, 'p-a')).toBe('fired');
            expect(inv(s)).toEqual({ 'i-10mm': 3 });
        });
        it('useWeapon com munição gasta 1 e retorna fired', () => {
            const s = makeState({ players: [player({ equippedWeaponId: 'i-pistol', inventory: [{ itemId: 'i-10mm', quantity: 3 }] })] });
            expect(rules.useWeapon(s, 'p-a')).toBe('fired');
            expect(inv(s)).toEqual({ 'i-10mm': 2 });
        });
        it('useWeapon sem munição retorna no-ammo e não altera o estado', () => {
            const s = makeState({ players: [player({ equippedWeaponId: 'i-pistol' })] });
            const before = structuredClone(s);
            expect(rules.useWeapon(s, 'p-a')).toBe('no-ammo');
            expect(s).toEqual(before);
        });
        it('sell soma value × quantidade em coins e tira do estoque', () => {
            const s = makeState({ players: [player({ coins: 1, inventory: [{ itemId: 'i-can', quantity: 5 }] })] });
            rules.sell(s, 'p-a', 'i-can', 3);
            expect(pa(s).coins).toBe(16);
            expect(inv(s)).toEqual({ 'i-can': 2 });
        });
        it('sell acima do estoque lança SEM ESTOQUE e não altera nada', () => {
            const s = makeState({ players: [player({ inventory: [{ itemId: 'i-can', quantity: 1 }] })] });
            const before = structuredClone(s);
            expect(() => rules.sell(s, 'p-a', 'i-can', 2)).toThrow('SEM ESTOQUE');
            expect(s).toEqual(before);
        });
        it('sell que zera a pilha da arma equipada desequipa', () => {
            const s = makeState({ players: [player({ equippedWeaponId: 'i-pistol', inventory: [{ itemId: 'i-pistol', quantity: 1 }] })] });
            rules.sell(s, 'p-a', 'i-pistol', 1);
            expect(pa(s).equippedWeaponId).toBeNull();
        });
        it('sell que zera a pilha da roupa equipada desequipa o slot', () => {
            const s = makeState({ players: [player({ equippedApparel: { head: 'i-helmet' }, inventory: [{ itemId: 'i-helmet', quantity: 1 }] })] });
            rules.sell(s, 'p-a', 'i-helmet', 1);
            expect(pa(s).equippedApparel).toEqual({});
        });
        it('craft sem insumos lança FALTAM INSUMOS e o estado fica idêntico', () => {
            const s = makeState({ players: [player({ inventory: [{ itemId: 'i-can', quantity: 2 }] })] });
            const before = structuredClone(s);
            expect(() => rules.craft(s, 'p-a', 'r-ammo')).toThrow('FALTAM INSUMOS');
            expect(s).toEqual(before);
        });
        it('craft consome insumos e soma os produtos', () => {
            const s = makeState({ players: [player({ inventory: [{ itemId: 'i-can', quantity: 3 }, { itemId: 'i-fan', quantity: 1 }, { itemId: 'i-10mm', quantity: 5 }] })] });
            rules.craft(s, 'p-a', 'r-ammo');
            expect(inv(s)).toEqual({ 'i-can': 1, 'i-10mm': 25 });
        });
        it('craft de receita inexistente lança RECEITA INEXISTENTE', () => {
            const s = makeState();
            expect(() => rules.craft(s, 'p-a', 'nope')).toThrow('RECEITA INEXISTENTE');
        });
    });

    describe('loot', () => {
        it('addLootBatch cria uma entrada por item com o source', () => {
            const s = makeState();
            rules.addLootBatch(s, [{ itemId: 'i-can', quantity: 2 }, { itemId: 'i-fan', quantity: 1 }], 'Baú');
            expect(s.loot.map(l => [l.itemId, l.quantity, l.source])).toEqual([['i-can', 2, 'Baú'], ['i-fan', 1, 'Baú']]);
        });
        it('claimLoot move para o inventário e remove o loot', () => {
            const s = makeState({ loot: [{ id: 'l1', itemId: 'i-can', quantity: 4, source: '' }] });
            rules.claimLoot(s, 'l1', 'p-a');
            expect(s.loot).toEqual([]);
            expect(inv(s)).toEqual({ 'i-can': 4 });
        });
        it('claimLoot de loot inexistente lança JÁ PEGARAM', () => {
            const s = makeState();
            expect(() => rules.claimLoot(s, 'l1', 'p-a')).toThrow('JÁ PEGARAM');
        });
    });

    describe('mapa', () => {
        const enemy = (o = {}) => createMapObject({ id: 'e1', type: 'enemy', label: 'Raider', hp: 10, maxHp: 10, loot: [{ itemId: 'i-can', quantity: 2 }], ...o });

        it('moveObjects atualiza x/y de vários objetos', () => {
            const s = makeState();
            s.map.objects = [createMapObject({ id: 'a' }), createMapObject({ id: 'b' })];
            rules.moveObjects(s, [{ id: 'a', x: 3, y: 4 }, { id: 'b', x: 5, y: 6 }]);
            expect(s.map.objects.map(o => [o.x, o.y])).toEqual([[3, 4], [5, 6]]);
        });
        it('removeObjects remove todos os ids', () => {
            const s = makeState();
            s.map.objects = [createMapObject({ id: 'a' }), createMapObject({ id: 'b' }), createMapObject({ id: 'c' })];
            rules.removeObjects(s, ['a', 'c']);
            expect(s.map.objects.map(o => o.id)).toEqual(['b']);
        });
        it('damageEnemy reduz hp do inimigo', () => {
            const s = makeState();
            s.map.objects = [enemy()];
            rules.damageEnemy(s, 'e1', 4);
            expect(s.map.objects[0].hp).toBe(6);
            expect(s.loot).toEqual([]);
        });
        it('damageEnemy que zera o hp remove o objeto e joga o loot com source = label', () => {
            const s = makeState();
            s.map.objects = [enemy()];
            rules.damageEnemy(s, 'e1', 10);
            expect(s.map.objects).toEqual([]);
            expect(s.loot.map(l => [l.itemId, l.quantity, l.source])).toEqual([['i-can', 2, 'Raider']]);
        });
        it('damageEnemy sem label usa source Inimigo', () => {
            const s = makeState();
            s.map.objects = [enemy({ label: '' })];
            rules.damageEnemy(s, 'e1', 10);
            expect(s.loot[0].source).toBe('Inimigo');
        });
        it('damageEnemy em objeto que não é inimigo lança NÃO É INIMIGO', () => {
            const s = makeState();
            s.map.objects = [createMapObject({ id: 'x' })];
            expect(() => rules.damageEnemy(s, 'x', 1)).toThrow('NÃO É INIMIGO');
        });
        it('setAmbientLight limita a 0..100 e arredonda', () => {
            const s = makeState();
            rules.setAmbientLight(s, 150);
            expect(s.map.ambientLight).toBe(100);
            rules.setAmbientLight(s, -3);
            expect(s.map.ambientLight).toBe(0);
            rules.setAmbientLight(s, 42.6);
            expect(s.map.ambientLight).toBe(43);
        });
        it('toggleEffect liga e desliga', () => {
            const s = makeState();
            rules.toggleEffect(s, 'rain');
            expect(s.map.effects).toEqual(['rain']);
            rules.toggleEffect(s, 'rain');
            expect(s.map.effects).toEqual([]);
        });
    });

    describe('importLegacy (migração do localStorage)', () => {
        const legacyPlayer = { id: 'old-1', label: 'Antigo', hp: 50, isYou: true, inventory: [{ itemId: 'i-can', quantity: 1 }] };

        it('importLegacy substitui items, quests, recipes, loot e map', () => {
            const s = makeState();
            rules.importLegacy(s, {
                items: [{ id: 'x', category: 'junk', label: 'X', weight: 0, value: 0 }],
                quests: [{ id: 'q', label: 'Q', location: '', objective: '', progress: '', status: 'ACTIVE', playerIds: [] }],
                recipes: [],
                loot: [{ id: 'l', itemId: 'x', quantity: 1, source: '' }],
                map: { name: 'Velho', backgroundImage: null, objects: [], ambientLight: 40, effects: [] } as any,
            });
            expect(s.items.map(i => i.id)).toEqual(['x']);
            expect(s.quests.map(q => q.id)).toEqual(['q']);
            expect(s.recipes).toEqual([]);
            expect(s.loot.map(l => l.id)).toEqual(['l']);
            expect(s.map).toMatchObject({ name: 'Velho', ambientLight: 40, views: [] });
        });
        it('importLegacy converte arma/roupa por usuário em equippedWeaponId/equippedApparel', () => {
            const s = makeState();
            rules.importLegacy(s, { players: [legacyPlayer] as any, arma: { 'old-1': 'i-pistol' }, roupa: { 'old-1': { head: 'i-helmet' } } });
            expect(pa(s, 'old-1')).toMatchObject({ equippedWeaponId: 'i-pistol', equippedApparel: { head: 'i-helmet' } });
        });
        it('importLegacy descarta isYou, põe userId null e preserva players já vinculados a usuários', () => {
            const s = makeState({ players: [player(), player({ id: 'p-solto', userId: null })] });
            rules.importLegacy(s, { players: [legacyPlayer] as any });
            expect(s.players.map(p => p.id)).toEqual(['p-a', 'old-1']);
            expect(pa(s, 'old-1').userId).toBeNull();
            expect('isYou' in pa(s, 'old-1')).toBe(false);
        });
        it('importLegacy normaliza o que veio (campos faltantes ganham defaults)', () => {
            const s = makeState();
            rules.importLegacy(s, { players: [legacyPlayer] as any, quests: [{ id: 'q', label: 'Q' } as any] });
            expect(pa(s, 'old-1')).toMatchObject({ hp: 50, maxHp: 100, rads: 0, level: 1, special: { strength: 5 } });
            expect(s.quests[0].playerIds).toEqual([]);
        });
        it('importLegacy sem uma coleção mantém a atual', () => {
            const s = makeState();
            rules.importLegacy(s, {});
            expect(s.items).toHaveLength(8);
        });
    });

    describe('cascatas', () => {
        it('removeItem tira o item de inventários, loot, loot de inimigos e equipamentos', () => {
            const s = makeState({
                players: [player({ equippedWeaponId: 'i-pistol', equippedApparel: { head: 'i-pistol' }, inventory: [{ itemId: 'i-pistol', quantity: 1 }, { itemId: 'i-can', quantity: 1 }] })],
                loot: [{ id: 'l1', itemId: 'i-pistol', quantity: 1, source: '' }],
            });
            s.map.objects = [createMapObject({ id: 'e', type: 'enemy', loot: [{ itemId: 'i-pistol', quantity: 1 }] })];
            rules.removeItem(s, 'i-pistol');
            expect(s.items.some(i => i.id === 'i-pistol')).toBe(false);
            expect(inv(s)).toEqual({ 'i-can': 1 });
            expect(pa(s).equippedWeaponId).toBeNull();
            expect(pa(s).equippedApparel).toEqual({});
            expect(s.loot).toEqual([]);
            expect(s.map.objects[0].loot).toEqual([]);
        });
        it('renameItem propaga o novo label nas receitas', () => {
            const s = makeState();
            rules.updateItem(s, 'i-can', { label: 'Lata' });
            expect(s.items.find(i => i.id === 'i-can')!.label).toBe('Lata');
            expect(s.recipes[0].inputs[0].itemLabel).toBe('Lata');
        });
        it('removePlayer tira o id das quests.playerIds', () => {
            const s = makeState({ quests: [{ id: 'q', label: '', location: '', objective: '', progress: '', status: 'ACTIVE', playerIds: ['p-a', 'p-b'] }] });
            rules.removePlayer(s, 'p-a');
            expect(s.players).toEqual([]);
            expect(s.quests[0].playerIds).toEqual(['p-b']);
        });
    });
});
