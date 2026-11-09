import { TestBed } from '@angular/core/testing';
import { LEGACY_KEYS, LegacyImportService } from '@shared/services/legacy-import.service';
import { RealtimeService } from '@shared/services/realtime.service';

describe('LegacyImportService', () => {
    let rt: RealtimeService;

    beforeEach(() => {
        Object.values(LEGACY_KEYS).forEach(key => localStorage.removeItem(key));
        TestBed.configureTestingModule({});
        rt = TestBed.inject(RealtimeService);
    });
    afterEach(() => Object.values(LEGACY_KEYS).forEach(key => localStorage.removeItem(key)));

    it('hasData é false sem chaves antigas', () => {
        expect(TestBed.inject(LegacyImportService).hasData()).toBeFalse();
    });

    it('lê as chaves antigas, envia admin:importLegacy e apaga as chaves no sucesso', async () => {
        localStorage.setItem(LEGACY_KEYS.items, JSON.stringify([{ id: 'i' }]));
        localStorage.setItem(LEGACY_KEYS.map, JSON.stringify({ version: 1, map: { name: 'M' } }));
        localStorage.setItem(LEGACY_KEYS.arma, JSON.stringify({ p: 'i' }));
        const command = spyOn(rt, 'command').and.resolveTo(undefined);
        const legacy = TestBed.inject(LegacyImportService);
        expect(legacy.hasData()).toBeTrue();

        await legacy.import();

        expect(command).toHaveBeenCalledWith('admin:importLegacy', { items: [{ id: 'i' }], map: { name: 'M' }, arma: { p: 'i' } });
        expect(localStorage.getItem(LEGACY_KEYS.items)).toBeNull();
        expect(legacy.hasData()).toBeFalse();
    });

    it('mantém as chaves se o servidor recusar', async () => {
        localStorage.setItem(LEGACY_KEYS.quests, '[]');
        spyOn(rt, 'command').and.rejectWith(new Error('SÓ O MESTRE.'));
        const legacy = TestBed.inject(LegacyImportService);
        await expectAsync(legacy.import()).toBeRejected();
        expect(localStorage.getItem(LEGACY_KEYS.quests)).toBe('[]');
    });
});
