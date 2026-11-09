import { Component, inject } from "@angular/core";
import { IconComponent } from "@shared/components/icon/icon.component";
import { pixelarticonsCloseBox, pixelarticonsHourglass, pixelarticonsMap, pixelarticonsNext, pixelarticonsPlay } from "@ngxi/pixelarticons";
import { AdminService } from "@shared/services/admin.service";
import { TurnService } from "@shared/services/turn.service";

/**
 * Barra de turnos do painel SESSÃO (todo mundo vê de quem é a vez).
 * Mestre: inicia, passa e encerra. Jogador da vez: passa o próprio turno.
 */
@Component({
    selector: 'pip-turn-bar',
    template: `
    <div
        class="flex flex-col gap-1 px-2 py-1.5 border text-xs"
        [class]="turn.isMyTurn() ? 'border-lime-400 bg-lime-400/15' : 'border-white/40'"
    >
        @if (turn.activePlayer(); as player) {
            <div class="flex flex-row items-center justify-between gap-2">
                <span class="flex items-center gap-1.5 min-w-0">
                    <pip-icon [icon]="icons.turn" size="24" />
                    <span class="shrink-0 size-2.5 rounded-full border border-white/50" [style.background-color]="player.color"></span>
                    <span class="truncate font-black">{{ turn.isMyTurn() ? 'SUA VEZ!' : 'VEZ DE ' + player.label }}</span>
                </span>
                <span class="shrink-0 opacity-70">RODADA {{ turn.turn().round }}</span>
            </div>
        } @else {
            <span class="flex items-center gap-1.5 opacity-70"><pip-icon [icon]="icons.explore" size="24" /> EXPLORAÇÃO — SEM TURNOS</span>
        }

        @if (admin.isAdmin() || turn.canPass()) {
            <div class="flex flex-row gap-1">
                @if (admin.isAdmin() && !turn.active()) {
                    <button type="button" class="flex-1 flex justify-center py-1 border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black" title="Iniciar turnos" aria-label="Iniciar turnos" (click)="turn.next()"><pip-icon [icon]="icons.start" size="24" /></button>
                }
                @if (turn.canPass()) {
                    <button type="button" class="flex-1 flex justify-center py-1 border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black" [title]="admin.isAdmin() ? 'Próximo turno' : 'Passar turno'" [attr.aria-label]="admin.isAdmin() ? 'Próximo turno' : 'Passar turno'" (click)="turn.next()"><pip-icon [icon]="icons.next" size="24" /></button>
                }
                @if (admin.isAdmin() && turn.active()) {
                    <button type="button" class="flex-1 flex justify-center py-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="turn.end()" title="Encerrar turnos (volta pro modo exploração)" aria-label="Encerrar turnos"><pip-icon [icon]="icons.stop" size="24" /></button>
                }
            </div>
        }
    </div>
    `,
    host: { class: 'block' },
    imports: [IconComponent],
})
export class TurnBarComponent {
    protected readonly turn = inject(TurnService);
    protected readonly admin = inject(AdminService);
    protected readonly icons = {
        turn: pixelarticonsHourglass, explore: pixelarticonsMap,
        start: pixelarticonsPlay, next: pixelarticonsNext, stop: pixelarticonsCloseBox,
    };
}
