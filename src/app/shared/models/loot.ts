import { generateId } from "@shared/utils/id";

/** Uma pilha de item largada no "chão" do grupo, disponível pra qualquer jogador pegar. */
export interface LootEntry {
    id: string;
    itemId: string;
    quantity: number;
    /** De onde veio (ex.: label do inimigo que morreu) — só exibição, opcional. */
    source: string;
}

export function createLootEntry(partial: Partial<LootEntry> & Pick<LootEntry, 'itemId'>): LootEntry {
    return {
        id: generateId('loot'),
        quantity: 1,
        source: '',
        ...partial,
    };
}
