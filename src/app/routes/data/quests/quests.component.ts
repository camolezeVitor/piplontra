import { Component, computed, inject, signal } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { Quest } from "@shared/models/quest";
import { PlayersService } from "@shared/services/players.service";
import { QuestsService } from "@shared/services/quests.service";

@Component({
    selector: "pip-quests",
    template: `
    <div class="flex flex-row h-full py-4 overflow-auto">
        <pip-list class="flex flex-col gap-1 w-2/5! overflow-auto">
            @for (quest of quests(); track quest.id) {
                <pip-list-item [isActive]="isSelected(quest)" class="flex flex-col" (onClick)="select(quest)">
                    <span>{{ quest.label }}</span>
                    <span class="text-xs opacity-70">{{ quest.status }}</span>
                </pip-list-item>
            }
        </pip-list>
        <section class="w-3/5 px-6 flex flex-col gap-6">
            @if (selected(); as quest) {
                <div class="flex justify-center">
                    <i class="text-white/80 fa-solid fa-scroll text-7xl pixelize"></i>
                </div>
                <div class="flex flex-col gap-1">
                    <pip-card class="px-2! py-1! bg-white/10!">{{ quest.label }}</pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Location</span>
                        <span>{{ quest.location }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! flex flex-col gap-1 bg-white/10!">
                        <span>Objective</span>
                        <span class="font-normal">{{ quest.objective }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Progress</span>
                        <span>{{ quest.progress }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Para</span>
                        <span>{{ assigneesLabel(quest) }}</span>
                    </pip-card>
                </div>
            }
        </section>
    </div>
    `,
    imports: [ListComponent, ListItemComponent, CardComponent]
})
export class QuestsComponent {
    private readonly questsService = inject(QuestsService);
    private readonly playersService = inject(PlayersService);

    /** Só mostra quests gerais (sem dono) ou atribuídas ao jogador selecionado na SESSÃO. */
    public quests = computed(() => {
        const player = this.playersService.selected();
        return this.questsService.quests().filter(quest =>
            quest.playerIds.length === 0 || (!!player && quest.playerIds.includes(player.id))
        );
    });
    public selected = signal<Quest | null>(null);

    constructor() {
        this.selected.set(this.quests()[0] ?? null);
    }

    public select(quest: Quest) { this.selected.set(quest); }
    public isSelected(quest: Quest) { return this.selected()?.id === quest.id; }

    protected assigneesLabel(quest: Quest): string {
        if (!quest.playerIds.length) return 'TODOS';
        return quest.playerIds
            .map(id => this.playersService.players().find(p => p.id === id)?.label)
            .filter((label): label is string => !!label)
            .join(', ') || 'TODOS';
    }
}
