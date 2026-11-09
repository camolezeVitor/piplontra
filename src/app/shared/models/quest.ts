import { generateId } from "@shared/utils/id";

export type QuestStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED';

export const QUEST_STATUSES: QuestStatus[] = ['ACTIVE', 'INACTIVE', 'COMPLETED'];

export interface Quest {
    id: string;
    label: string;
    location: string;
    objective: string;
    progress: string;
    status: QuestStatus;
    /** Jogadores donos dessa quest (ver `Player`) — vazio/ausente = quest geral, visível pra todo mundo. */
    playerIds: string[];
}

export function createQuest(partial: Partial<Quest> = {}): Quest {
    return {
        id: generateId('quest'),
        label: 'NOVA QUEST',
        location: '',
        objective: '',
        progress: '',
        status: 'ACTIVE',
        playerIds: [],
        ...partial,
    };
}
