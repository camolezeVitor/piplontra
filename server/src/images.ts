/**
 * O front manda imagens como data URL (base64). Antes de qualquer comando, o servidor troca
 * cada `data:image/...` do payload por um arquivo em `uploads/` e guarda só a URL —
 * assim o sync não carrega megabytes de base64 a cada mudança.
 */
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';

const DATA_URL = /^data:image\/([a-z0-9.+-]+);base64,(.*)$/is;
const EXTENSIONS: Record<string, string> = { jpeg: 'jpg', 'svg+xml': 'svg' };

function save(dataUrl: string, dir: string): string {
    const match = DATA_URL.exec(dataUrl);
    if (!match) return dataUrl;
    const mime = match[1].toLowerCase();
    const name = `${randomUUID()}.${EXTENSIONS[mime] ?? mime}`;
    writeFileSync(join(dir, name), Buffer.from(match[2], 'base64'));
    return `/uploads/${name}`;
}

/** Percorre o valor recursivamente, troca as data URLs no lugar e devolve o próprio valor. */
export function extractDataUrls<T>(value: T, dir: string): T {
    if (typeof value === 'string') return save(value, dir) as T;
    if (Array.isArray(value)) {
        value.forEach((v, i) => { value[i] = extractDataUrls(v, dir); });
    } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) (value as Record<string, unknown>)[k] = extractDataUrls(v, dir);
    }
    return value;
}
