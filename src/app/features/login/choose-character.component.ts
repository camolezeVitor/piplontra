import { Component, ElementRef, inject, viewChild } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { OutlineDirective } from "@shared/directives/outline/outline.directive";
import { TitleDirective } from "@shared/directives/text/title.directive";
import { Player } from "@shared/models/player";
import { AuthService } from "@shared/services/auth.service";
import { PlayersService } from "@shared/services/players.service";
import { RealtimeService } from "@shared/services/realtime.service";
import { CharacterListComponent } from "./character-list.component";

/**
 * Depois do login, o jogador (nunca o Mestre) escolhe qual personagem é o dele.
 * Personagem com dono fica travado — o servidor garante que só um leva.
 */
@Component({
    selector: 'pip-choose-character',
    template: `
    <div pipOutline class="flex flex-col gap-4 p-6 w-[420px] max-h-[90dvh]">
        <p pipTitle>ESCOLHA SEU PERSONAGEM</p>

        <div class="overflow-auto">
            <pip-character-list (picked)="choose($event)" />
        </div>

        <form class="flex flex-col gap-1 pt-3 border-t border-white/30" (submit)="$event.preventDefault(); create()">
            <span class="text-xs opacity-80">OU CRIE UM NOVO</span>
            <div class="flex flex-row gap-1">
                <input #newName class="field flex-1 min-w-0" type="text" placeholder="NOME DO PERSONAGEM" [value]="auth.me()?.nickname ?? ''" />
                <pip-card class="bg-white! outline-white text-black/50! cursor-pointer select-none hover:bg-white/80!" (click)="create()">CRIAR</pip-card>
            </div>
        </form>

        @if (rt.error(); as error) {
            <p class="text-xs text-red-400">{{ error }}</p>
        }

        <button type="button" class="self-start text-xs opacity-80 underline cursor-pointer" (click)="auth.logout()">Sair</button>
    </div>
    `,
    styles: `
    .field {
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus { outline: 2px solid white; }
    `,
    imports: [OutlineDirective, TitleDirective, CardComponent, CharacterListComponent],
})
export class ChooseCharacterComponent {
    protected readonly auth = inject(AuthService);
    protected readonly rt = inject(RealtimeService);
    private readonly playersService = inject(PlayersService);

    private readonly newName = viewChild.required<ElementRef<HTMLInputElement>>('newName');

    protected choose(player: Player): void {
        this.playersService.claim(player.id);
    }

    protected create(): void {
        this.playersService.createOwn(this.newName().nativeElement.value.trim());
    }
}
