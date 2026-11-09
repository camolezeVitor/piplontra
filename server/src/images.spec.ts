import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { extractDataUrls } from './images';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const png = `data:image/png;base64,${PNG_BYTES.toString('base64')}`;

describe('images', () => {
    let dir: string;
    beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pip-img-')); });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('troca data:image/png;base64 por /uploads/<uuid>.png e grava os bytes corretos', () => {
        const out = extractDataUrls({ image: png }, dir);
        expect(out.image).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
        const file = out.image.replace('/uploads/', '');
        expect(readFileSync(join(dir, file))).toEqual(PNG_BYTES);
    });

    it('usa a extensão do mime (jpeg → .jpg, webp → .webp)', () => {
        const out = extractDataUrls(['data:image/jpeg;base64,AAAA', 'data:image/webp;base64,AAAA'], dir);
        expect(out[0]).toMatch(/\.jpg$/);
        expect(out[1]).toMatch(/\.webp$/);
    });

    it('percorre objetos e arrays aninhados', () => {
        const payload = { map: { backgroundImage: png, objects: [{ id: 'a', backgroundImage: png }, { id: 'b', backgroundImage: null }] } };
        const out = extractDataUrls(payload, dir);
        expect(out.map.backgroundImage).toMatch(/^\/uploads\//);
        expect(out.map.objects[0].backgroundImage).toMatch(/^\/uploads\//);
        expect(out.map.objects[1].backgroundImage).toBeNull();
        expect(readdirSync(dir)).toHaveLength(2);
    });

    it('não mexe em strings comuns nem em URLs /uploads já existentes', () => {
        const out = extractDataUrls({ a: 'texto', b: '/uploads/x.png', c: 3, d: true }, dir);
        expect(out).toEqual({ a: 'texto', b: '/uploads/x.png', c: 3, d: true });
        expect(readdirSync(dir)).toHaveLength(0);
    });

    it('ignora data: que não seja imagem', () => {
        const out = extractDataUrls({ a: 'data:text/plain;base64,AAAA' }, dir);
        expect(out.a).toBe('data:text/plain;base64,AAAA');
    });
});
