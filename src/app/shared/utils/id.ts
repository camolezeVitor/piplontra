// Gerador de id simples, com fallback pra navegadores/contextos sem
// crypto.randomUUID (ex.: uma aba não-https em rede local durante um jogo).
export function generateId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
