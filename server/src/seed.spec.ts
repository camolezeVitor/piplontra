import { APPAREL_SLOTS, ITEM_RARITIES, WEAPON_AMMO_TYPE_TO_AMMO_LABEL, WEAPON_TYPES } from './models';
import { seedItems, seedRecipes } from './seed';

/** Munição "não rastreada" de propósito: armas brancas/arremessáveis e a Junk Jet (atira sucata). */
const UNTRACKED_AMMO = ['—', 'Junk'];

describe('seed de itens (coerência)', () => {
    const items = seedItems();
    const byCategory = (c: string) => items.filter(i => i.category === c);
    const labels = new Set(items.map(i => i.label));

    it('tem pelo menos 300 itens', () => {
        expect(items.length).toBeGreaterThanOrEqual(300);
    });

    it('não repete label (receitas e munição referenciam itens por label)', () => {
        const seen = new Set<string>();
        const dupes = items.map(i => i.label).filter(l => seen.has(l) || !seen.add(l));
        expect(dupes).toEqual([]);
    });

    it('todo item tem raridade válida, e existem itens de todas as raridades', () => {
        const valid = ITEM_RARITIES.map(r => r.value);
        expect(items.filter(i => !valid.includes(i.rarity!)).map(i => i.label)).toEqual([]);
        expect(new Set(items.map(i => i.rarity))).toEqual(new Set(valid));
    });

    it('toda arma tem tipo válido, dano, alcance e cadência', () => {
        const types = WEAPON_TYPES.map(t => t.value);
        const bad = byCategory('weapon').filter(w =>
            !types.includes(w.weaponType!) || !(w.damage! > 0) || !(w.range! > 0) || !(w.rate! > 0) || !w.ammoType);
        expect(bad.map(w => w.label)).toEqual([]);
    });

    it('toda arma de fogo gasta uma munição que existe no catálogo', () => {
        const ammo = new Set(byCategory('ammo').map(i => i.label));
        const bad = byCategory('weapon')
            .filter(w => !UNTRACKED_AMMO.includes(w.ammoType!))
            .filter(w => !ammo.has(WEAPON_AMMO_TYPE_TO_AMMO_LABEL[w.ammoType!]))
            .map(w => `${w.label} (${w.ammoType})`);
        expect(bad).toEqual([]);
    });

    it('toda roupa tem slot válido e resistências numéricas', () => {
        const slots = APPAREL_SLOTS.map(s => s.value);
        const bad = byCategory('apparel').filter(a =>
            !slots.includes(a.apparelSlot!) || [a.dr, a.er, a.rr].some(v => typeof v !== 'number'));
        expect(bad.map(a => a.label)).toEqual([]);
    });

    it('todo item de ajuda tem hp, rads e efeito', () => {
        const bad = byCategory('aid').filter(a => typeof a.hp !== 'number' || typeof a.rads !== 'number' || !a.effect);
        expect(bad.map(a => a.label)).toEqual([]);
    });

    it('sucata tem componentes, mods têm slot e diversos dizem se são de quest', () => {
        expect(byCategory('junk').filter(j => !j.component).map(j => j.label)).toEqual([]);
        expect(byCategory('mod').filter(m => !m.slot).map(m => m.label)).toEqual([]);
        expect(byCategory('misc').filter(m => typeof m.isQuest !== 'boolean').map(m => m.label)).toEqual([]);
    });

    it('peso e valor nunca são negativos', () => {
        expect(items.filter(i => i.weight < 0 || i.value < 0).map(i => i.label)).toEqual([]);
    });

    it('todas as receitas padrão referenciam itens que existem', () => {
        const missing = seedRecipes().flatMap(r => [...r.inputs, ...r.outputs]).map(e => e.itemLabel).filter(l => !labels.has(l));
        expect(missing).toEqual([]);
    });
});
