import { Component, inject, signal } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { IconComponent } from "@shared/components/icon/icon.component";
import { pixelarticonsRepeat } from "@ngxi/pixelarticons";
import { ModalComponent } from "@shared/components/modal/modal.component";
import { Player } from "@shared/models/player";
import { PlayersService } from "@shared/services/players.service";
import { RealtimeService } from "@shared/services/realtime.service";
import { CharacterListComponent } from "./character-list.component";

/** Botão "TROCAR PERSONAGEM" do painel SESSÃO (só jogadores): lista os personagens e troca por um livre. */
@Component({
    selector: 'pip-switch-character',
    template: `
    <pip-card
        class="px-2! py-1.5! bg-white! outline-white text-black/50! cursor-pointer select-none hover:bg-white/80! hover:outline-2 hover:outline-offset-2"
        title="Trocar de personagem" aria-label="Trocar de personagem"
        (click)="open.set(true)"
    ><pip-icon [icon]="icons.swap" size="24" /></pip-card>

    <pip-modal title="TROCAR PERSONAGEM" [(open)]="open">
        <p class="text-xs opacity-60 mb-3">Só os personagens livres podem ser escolhidos. O seu atual fica livre pra outro jogador.</p>
        <pip-character-list actionLabel="TROCAR" (picked)="switchTo($event)" />
        @if (rt.error(); as error) {
            <p class="text-xs text-red-400 mt-2">{{ error }}</p>
        }
    </pip-modal>
    `,
    host: { class: 'block' },
    imports: [CardComponent, ModalComponent, CharacterListComponent, IconComponent],
})
export class SwitchCharacterComponent {
    protected readonly rt = inject(RealtimeService);
    private readonly playersService = inject(PlayersService);

    protected readonly open = signal(false);
    protected readonly icons = { swap: pixelarticonsRepeat };

    protected switchTo(player: Player): void {
        this.playersService.switchTo(player.id)
            .then(() => this.open.set(false))
            .catch(() => { /* ex.: alguém pegou antes — a mensagem aparece no modal */ });
    }
}
