import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { QUEST_STATUSES, Quest, QuestStatus } from "@shared/models/quest";
import { PlayersService } from "@shared/services/players.service";
import { QuestsService } from "@shared/services/quests.service";

const STATUS_FILTERS: Array<{ value: QuestStatus | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'TODAS' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'INACTIVE', label: 'INACTIVE' },
    { value: 'COMPLETED', label: 'COMPLETED' },
];

@Component({
    selector: 'pip-admin-quests',
    template: `
    <div class="flex flex-row gap-3 h-104">
        <div class="flex flex-col gap-2 w-2/5 min-w-0">
            <div class="flex flex-row flex-wrap gap-1">
                @for (filter of statusFilters; track filter.value) {
                    <button
                        type="button"
                        class="px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                        [class.bg-white]="statusFilter() === filter.value"
                        [class.text-black]="statusFilter() === filter.value"
                        (click)="statusFilter.set(filter.value)"
                    >
                        {{ filter.label }}
                    </button>
                }
            </div>
            <input class="field" type="text" placeholder="BUSCAR..." [value]="search()" (input)="search.set(text($event))" />
            <button type="button" class="self-start px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="add()">
                + NOVA QUEST
            </button>

            <pip-list class="flex-1 overflow-auto min-h-0">
                @for (quest of elements(); track quest.id) {
                    <pip-list-item [isActive]="selectedId() === quest.id" class="flex flex-col" (onClick)="select(quest.id)">
                        <span class="truncate">{{ quest.label }}</span>
                        <span class="text-xs opacity-60">{{ quest.status }} · {{ quest.playerIds.length ? quest.playerIds.length + ' JOGADOR(ES)' : 'TODOS' }}</span>
                    </pip-list-item>
                } @empty {
                    <p class="opacity-60 p-2">NENHUMA QUEST ENCONTRADA.</p>
                }
            </pip-list>
        </div>

        <div class="w-3/5 min-w-0 overflow-auto border-l border-white/20 pl-3">
            @if (selected(); as quest) {
                <div class="flex flex-col gap-2">
                    <div class="flex flex-row gap-1">
                        <input class="field flex-1" type="text" placeholder="TÍTULO" [value]="quest.label" (change)="update(quest.id, { label: text($event) })" />
                        <button type="button" class="px-2 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="remove(quest.id)">✕</button>
                    </div>
                    <label class="field flex items-center gap-1 w-fit">
                        <span class="opacity-60">STATUS</span>
                        <select class="bg-transparent outline-none" [value]="quest.status" (change)="updateStatus(quest.id, $event)">
                            @for (status of statuses; track status) {
                                <option [value]="status">{{ status }}</option>
                            }
                        </select>
                    </label>
                    <input class="field" type="text" placeholder="LOCAL" [value]="quest.location" (change)="update(quest.id, { location: text($event) })" />
                    <input class="field" type="text" placeholder="PROGRESSO (ex.: 1/3)" [value]="quest.progress" (change)="update(quest.id, { progress: text($event) })" />
                    <input class="field" type="text" placeholder="OBJETIVO" [value]="quest.objective" (change)="update(quest.id, { objective: text($event) })" />

                    <div class="flex flex-col gap-1 pt-1 border-t border-white/20">
                        <span class="opacity-60">PERTENCE A (VAZIO = TODOS VEEM)</span>
                        @for (player of players.players(); track player.id) {
                            <label class="flex flex-row items-center gap-2 cursor-pointer">
                                <input type="checkbox" [checked]="quest.playerIds.includes(player.id)" (change)="questsService.togglePlayer(quest.id, player.id)" />
                                <span class="flex flex-row items-center gap-1.5">
                                    <span class="shrink-0 size-2.5 rounded-full border border-white/50" [style.background-color]="player.color"></span>
                                    {{ player.label }}
                                </span>
                            </label>
                        }
                    </div>
                </div>
            } @else {
                <p class="opacity-60">SELECIONE UMA QUEST NA LISTA.</p>
            }
        </div>
    </div>
    `,
    styles: `
    .field {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus-within { background: rgba(255,255,255,0.2); }
    `,
    imports: [ListComponent, ListItemComponent],
})
export class AdminQuestsComponent {
    protected readonly questsService = inject(QuestsService);
    protected readonly players = inject(PlayersService);

    protected readonly statuses = QUEST_STATUSES;
    protected readonly statusFilters = STATUS_FILTERS;
    protected readonly statusFilter = signal<QuestStatus | 'ALL'>('ALL');
    protected readonly search = signal('');
    protected readonly selectedId = signal<string | null>(null);

    protected readonly elements = computed(() => {
        const term = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        return this.questsService.quests().filter(quest =>
            (status === 'ALL' || quest.status === status) &&
            (!term || quest.label.toLowerCase().includes(term))
        );
    });

    protected readonly selected = computed(() =>
        this.questsService.quests().find(quest => quest.id === this.selectedId()) ?? null
    );

    constructor() {
        this.selectedId.set(this.elements()[0]?.id ?? null);
    }

    protected add(): void {
        const quest = this.questsService.addQuest();
        this.selectedId.set(quest.id);
    }

    protected select(id: string): void {
        this.selectedId.set(id);
    }

    protected update(id: string, changes: Partial<Quest>): void {
        this.questsService.updateQuest(id, changes);
    }

    protected updateStatus(id: string, event: Event): void {
        this.questsService.updateQuest(id, { status: this.text(event) as QuestStatus });
    }

    protected remove(id: string): void {
        this.questsService.removeQuest(id);
        if (this.selectedId() === id) this.selectedId.set(this.elements()[0]?.id ?? null);
    }

    protected text(event: Event): string {
        return (event.target as HTMLInputElement | HTMLSelectElement).value;
    }
}
