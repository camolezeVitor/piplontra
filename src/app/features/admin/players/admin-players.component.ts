import { Component, computed, inject } from "@angular/core";
import { PlayersService } from "@shared/services/players.service";
import { RealtimeService } from "@shared/services/realtime.service";

@Component({
    selector: 'pip-admin-players',
    template: `
    <div class="flex flex-col gap-2">
        <button type="button" class="self-start px-2 py-1 font-black border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addPlayer()">
            + NOVO JOGADOR
        </button>

        <div class="flex flex-col gap-2 max-h-96 overflow-auto">
            @for (player of players(); track player.id) {
                <div
                    class="flex flex-col gap-1 p-2 border cursor-pointer"
                    [class.border-white]="selectedId() === player.id"
                    [class.border-white/30]="selectedId() !== player.id"
                    (click)="select(player.id)"
                >
                    <div class="flex flex-row gap-1" (click)="$event.stopPropagation()">
                        <input
                            type="color"
                            class="w-8 h-8 p-0 shrink-0 bg-transparent border border-white/40 cursor-pointer"
                            [value]="player.color"
                            (input)="patch(player.id, { color: text($event) })"
                        />
                        <input class="field flex-1" type="text" placeholder="NOME" [value]="player.label" (change)="patch(player.id, { label: text($event) })" />
                        <input class="field w-28" type="text" placeholder="ARMA" [value]="player.weapon" (change)="patch(player.id, { weapon: text($event) })" />
                        <button type="button" class="px-2 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="removePlayer(player.id)">✕</button>
                    </div>
                    <div class="flex flex-row gap-1" (click)="$event.stopPropagation()">
                        <label class="field flex items-center gap-1">
                            <span class="opacity-60">HP</span>
                            <input class="bg-transparent outline-none w-14" type="number" [value]="player.hp" (change)="patch(player.id, { hp: number($event) })" />
                            <span class="opacity-60">/</span>
                            <input class="bg-transparent outline-none w-14" type="number" [value]="player.maxHp" (change)="patch(player.id, { maxHp: number($event) })" />
                        </label>
                        <label class="field flex items-center gap-1">
                            <span class="opacity-60">AP</span>
                            <input class="bg-transparent outline-none w-14" type="number" [value]="player.ap" (change)="patch(player.id, { ap: number($event) })" />
                            <span class="opacity-60">/</span>
                            <input class="bg-transparent outline-none w-14" type="number" [value]="player.maxAp" (change)="patch(player.id, { maxAp: number($event) })" />
                        </label>
                        <label class="field flex items-center gap-1 min-w-0">
                            <span class="opacity-60">DONO</span>
                            <select class="bg-transparent outline-none min-w-0" (change)="patch(player.id, { userId: text($event) || null })">
                                <option value="" [selected]="!player.userId">— NINGUÉM —</option>
                                @for (user of owners(); track user.id) {
                                    <option [value]="user.id" [selected]="player.userId === user.id">{{ user.nickname || user.username }}</option>
                                }
                            </select>
                        </label>
                    </div>
                </div>
            } @empty {
                <p class="opacity-60">NENHUM JOGADOR CADASTRADO.</p>
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
})
export class AdminPlayersComponent {
    private readonly _playersService = inject(PlayersService);
    private readonly _rt = inject(RealtimeService);

    protected readonly players = this._playersService.players;
    protected readonly selectedId = this._playersService.selectedId;
    /** Usuários que podem ser donos de um personagem (o Mestre não joga). */
    protected readonly owners = computed(() => this._rt.users().filter(user => !user.isMaster));

    protected select(id: string): void {
        this._playersService.select(id);
    }

    protected addPlayer(): void {
        const player = this._playersService.addPlayer();
        this._playersService.select(player.id);
    }

    protected removePlayer(id: string): void {
        this._playersService.removePlayer(id);
    }

    protected patch(id: string, changes: Record<string, unknown>): void {
        this._playersService.updatePlayer(id, changes as any);
    }

    protected text(event: Event): string {
        return (event.target as HTMLInputElement | HTMLSelectElement).value;
    }

    protected number(event: Event): number {
        const raw = Number((event.target as HTMLInputElement).value);
        return Number.isFinite(raw) ? raw : 0;
    }
}
