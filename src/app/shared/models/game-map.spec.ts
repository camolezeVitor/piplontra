import { createMapObject, objectMatchesFilter } from '@shared/models/game-map';

describe('objectMatchesFilter', () => {
    const banco = createMapObject({ label: 'Banco de Granada', type: 'location', x: 30, y: 20 });

    it('filtro vazio aceita tudo', () => {
        expect(objectMatchesFilter(banco, '')).toBeTrue();
        expect(objectMatchesFilter(banco, '   ')).toBeTrue();
    });

    it('casa pelo nome, sem diferenciar maiúscula nem acento', () => {
        expect(objectMatchesFilter(banco, 'granada')).toBeTrue();
        expect(objectMatchesFilter(createMapObject({ label: 'Fábrica de Munição' }), 'fabrica municao')).toBeTrue();
        expect(objectMatchesFilter(banco, 'hospital')).toBeFalse();
    });

    it('todas as palavras do filtro precisam aparecer', () => {
        expect(objectMatchesFilter(banco, 'banco granada')).toBeTrue();
        expect(objectMatchesFilter(banco, 'banco miresol')).toBeFalse();
    });

    it('casa pelo nome do tipo (ex.: "inimigo", "localização")', () => {
        expect(objectMatchesFilter(banco, 'localizacao')).toBeTrue();
        expect(objectMatchesFilter(createMapObject({ type: 'enemy', label: 'Raider' }), 'inimigo')).toBeTrue();
    });

    it('casa pela coordenada no formato XxY', () => {
        expect(objectMatchesFilter(banco, '30x20')).toBeTrue();
        expect(objectMatchesFilter(banco, '20x30')).toBeFalse();
    });

    it('"oculto" filtra só os objetos invisíveis pros jogadores', () => {
        expect(objectMatchesFilter({ ...banco, hidden: true }, 'oculto')).toBeTrue();
        expect(objectMatchesFilter(banco, 'oculto')).toBeFalse();
    });
});
