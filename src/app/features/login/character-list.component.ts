import { Component, computed, inject, input, output } from "@angular/core";
import { Player } from "@shared/models/player";
import { PlayersService } from "@shared/services/players.service";
import { RealtimeService } from "@shared/services/realtime.service";

/**
 * Lista de personagens pra um jogador escolher. Só os LIVRES ficam com 100% de
 * opacidade e clicáveis; os com dono (e o atual do próprio jogador) aparecem
 * esmaecidos e travados. Usada na escolha do login e no "TROCAR PERSONAGEM".
 */
@Component({
    selector: 'pip-character-list',
    template: `
    <div class="flex flex-col gap-1">
        @for (player of players(); track player.id) {
            @let status = statusOf(player);
            <button
                type="button"
                class="flex flex-row items-center gap-3 p-2 border text-left"
                [class]="status.free ? 'border-white/60 cursor-pointer hover:bg-white hover:text-black' : 'border-white/20 opacity-40 cursor-not-allowed'"
                [disabled]="!status.free"
                (click)="picked.emit(player)"
            >
                <img [src]="player.image || '/players/ex1.png'" alt="" class="w-10 h-10 shrink-0 object-cover object-top border border-white/50" style="image-rendering: pixelated" />
                <span class="flex-1 min-w-0 flex flex-col">
                    <span class="flex items-center gap-1.5">
                        <span class="shrink-0 size-2.5 rounded-full border border-white/50" [style.background-color]="player.color"></span>
                        <span class="truncate">{{ player.label }}</span>
                    </span>
                    <span class="text-xs opacity-70">LV {{ player.level }} · HP {{ player.hp }}/{{ player.maxHp }}</span>
                </span>
                <span class="shrink-0 text-xs">
                    @if (status.mine) {
                        ATUAL
                    } @else if (status.owner) {
                        <i class="fa-solid fa-lock"></i> {{ status.owner }}
                    } @else {
                        {{ actionLabel() }}
                    }
                </span>
            </button>
        } @empty {
            <p class="text-xs opacity-60">O MESTRE AINDA NÃO CRIOU NENHUM PERSONAGEM.</p>
        }
    </div>
    `,
})
export class CharacterListComponent {
    private readonly rt = inject(RealtimeService);
    protected readonly players = inject(PlayersService).players;

    /** Texto do botão nos personagens livres (ex.: "ESCOLHER", "TROCAR"). */
    readonly actionLabel = input('ESCOLHER');
    readonly picked = output<Player>();

    private readonly userNames = computed(() => new Map(this.rt.users().map(u => [u.id, u.nickname || u.username])));

    protected statusOf(player: Player): { free: boolean; mine: boolean; owner: string | null } {
        if (!player.userId) return { free: true, mine: false, owner: null };
        const mine = player.userId === this.rt.me()?.id;
        return { free: false, mine, owner: mine ? null : this.userNames().get(player.userId) ?? 'OUTRO JOGADOR' };
    }
}
