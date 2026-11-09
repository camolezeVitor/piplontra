import { TestBed } from '@angular/core/testing';
import { createEmptyGameMap, createMapObject } from '@shared/models/game-map';
import { MapService } from '@shared/services/map.service';
import { RealtimeService } from '@shared/services/realtime.service';

describe('MapService', () => {
    let rt: RealtimeService;
    let send: jasmine.Spy;
    let map: MapService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        rt = TestBed.inject(RealtimeService);
        send = spyOn(rt, 'send');
        map = TestBed.inject(MapService);
    });

    it('os campos do mapa espelham rt.map', () => {
        rt.map.set({ ...createEmptyGameMap(), name: 'Concord', ambientLight: 30, objects: [createMapObject({ id: 'o' })] });
        expect(map.name()).toBe('Concord');
        expect(map.ambientLight()).toBe(30);
        expect(map.objects().map(o => o.id)).toEqual(['o']);
    });

    it('addObject envia map:addObject e já seleciona o objeto', () => {
        const object = map.addObject({ x: 2, y: 3 });
        expect(send).toHaveBeenCalledWith('map:addObject', { object });
        expect(map.selectedObjectId()).toBe(object.id);
    });

    it('removeSelected envia um único map:removeObjects e limpa a seleção', () => {
        map.selectObjects(['a', 'b']);
        map.removeSelected();
        expect(send).toHaveBeenCalledOnceWith('map:removeObjects', { ids: ['a', 'b'] });
        expect(map.selectedObjectIds()).toEqual([]);
    });

    it('moveObjects envia map:moveObjects', () => {
        map.moveObjects([{ id: 'a', x: 1, y: 1 }]);
        expect(send).toHaveBeenCalledWith('map:moveObjects', { moves: [{ id: 'a', x: 1, y: 1 }] });
    });

    it('dragTo mostra a prévia local na hora e envia map:moveObjects; endDrag volta pro servidor', () => {
        rt.map.set({ ...createEmptyGameMap(), objects: [createMapObject({ id: 'a', x: 0, y: 0 }), createMapObject({ id: 'b', x: 5, y: 5 })] });
        map.dragTo([{ id: 'a', x: 2, y: 3 }]);
        expect(map.objects().map(o => [o.id, o.x, o.y])).toEqual([['a', 2, 3], ['b', 5, 5]]);
        expect(send).toHaveBeenCalledWith('map:moveObjects', { moves: [{ id: 'a', x: 2, y: 3 }] });
        map.endDrag();
        expect(map.objects()[0].x).toBe(0);
    });

    describe('objetos ocultos', () => {
        const ME = { id: 'u', username: 'u', nickname: '', avatar: null, color: '#fff', isMaster: false };
        beforeEach(() => {
            rt.map.set({ ...createEmptyGameMap(), objects: [createMapObject({ id: 'a' }), createMapObject({ id: 'b', hidden: true })] });
        });

        it('jogador não vê objetos ocultos', () => {
            rt.me.set(ME);
            expect(map.visibleObjects().map(o => o.id)).toEqual(['a']);
        });
        it('mestre vê todos, inclusive os ocultos', () => {
            rt.me.set({ ...ME, isMaster: true });
            expect(map.visibleObjects().map(o => o.id)).toEqual(['a', 'b']);
        });
        it('mestre em "ver como jogador" não vê os ocultos', () => {
            rt.me.set({ ...ME, isMaster: true });
            map.previewAsPlayer.set(true);
            expect(map.visibleObjects().map(o => o.id)).toEqual(['a']);
        });
        it('toggleHidden envia o valor invertido', () => {
            map.toggleHidden('b');
            map.toggleHidden('a');
            expect(send.calls.allArgs()).toEqual([
                ['map:updateObject', { id: 'b', patch: { hidden: false } }],
                ['map:updateObject', { id: 'a', patch: { hidden: true } }],
            ]);
        });
    });

    it('comandos simples do mapa', () => {
        map.setName('X');
        map.setAmbientLight(40);
        map.toggleEffect('rain');
        map.updateObject('o', { label: 'L' });
        map.damageObject('o', 3);
        map.updateView('v', { label: 'V' });
        map.removeView('v');
        expect(send.calls.allArgs()).toEqual([
            ['map:setName', { name: 'X' }],
            ['map:setAmbientLight', { value: 40 }],
            ['map:toggleEffect', { type: 'rain' }],
            ['map:updateObject', { id: 'o', patch: { label: 'L' } }],
            ['map:damageObject', { id: 'o', amount: 3 }],
            ['map:updateView', { id: 'v', patch: { label: 'V' } }],
            ['map:removeView', { id: 'v' }],
        ]);
    });

    it('toggleViewEnabled envia o valor invertido', () => {
        rt.map.set({ ...createEmptyGameMap(), views: [{ id: 'v', label: '', points: [], enabled: true }] });
        map.toggleViewEnabled('v');
        expect(send).toHaveBeenCalledWith('map:updateView', { id: 'v', patch: { enabled: false } });
    });

    it('finishDrawingView com 3+ vértices envia map:addView e limpa o desenho', () => {
        map.startNewView();
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }].forEach(p => map.addViewPoint(p));
        map.finishDrawingView('Sala');
        expect(send).toHaveBeenCalledWith('map:addView', { view: jasmine.objectContaining({ label: 'Sala', enabled: true, points: jasmine.any(Array) }) });
        expect(map.drawingView()).toEqual([]);
    });

    it('ping envia map:pulse; fx:pulse do servidor vira pulse local com o nome e a cor de quem pingou', () => {
        map.ping(10, 20);
        expect(send).toHaveBeenCalledWith('map:pulse', { x: 10, y: 20 });
        rt.dispatch('fx:pulse', { x: 10, y: 20, name: 'Courier', color: '#ff5b5b' });
        expect(map.pulses()).toEqual([jasmine.objectContaining({ x: 10, y: 20, label: 'Courier', color: '#ff5b5b' })]);
    });

    it('dragOwnTo mostra a prévia local e envia map:moveOwn com o personagem do jogador', () => {
        rt.map.set({ ...createEmptyGameMap(), objects: [createMapObject({ id: 'tok', type: 'player', playerId: 'p-a', x: 0, y: 0 })] });
        map.dragOwnTo('p-a', 'tok', 4, 5);
        expect(map.objects()[0]).toEqual(jasmine.objectContaining({ x: 4, y: 5 }));
        expect(send).toHaveBeenCalledWith('map:moveOwn', { playerId: 'p-a', objectId: 'tok', x: 4, y: 5 });
        map.endDrag();
        expect(map.objects()[0].x).toBe(0);
    });
});
