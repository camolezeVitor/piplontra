import { Injectable, inject } from "@angular/core";
import { Quest, createQuest } from "@shared/models/quest";
import { RealtimeService } from "@shared/services/realtime.service";

@Injectable({ providedIn: 'root' })
export class QuestsService {
    private readonly rt = inject(RealtimeService);

    readonly quests = this.rt.quests.asReadonly();

    addQuest(partial: Partial<Quest> = {}): Quest {
        const quest = createQuest(partial);
        this.rt.send('quests:add', { quest });
        return quest;
    }

    updateQuest(id: string, changes: Partial<Quest>): void {
        this.rt.send('quests:update', { id, changes });
    }

    /** Atribui/desatribui a quest a um jogador (lista vazia = quest geral). */
    togglePlayer(questId: string, playerId: string): void {
        const quest = this.quests().find(q => q.id === questId);
        if (!quest) return;
        const playerIds = quest.playerIds.includes(playerId)
            ? quest.playerIds.filter(id => id !== playerId)
            : [...quest.playerIds, playerId];
        this.updateQuest(questId, { playerIds });
    }

    removeQuest(id: string): void {
        this.rt.send('quests:remove', { id });
    }
}
