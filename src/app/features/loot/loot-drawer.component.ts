import { Component, inject, signal } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { IconComponent } from "@shared/components/icon/icon.component";
import { pixelarticonsBriefcase } from "@ngxi/pixelarticons";
import { ModalComponent } from "@shared/components/modal/modal.component";
import { LootEntry } from "@shared/models/loot";
import { AdminService } from "@shared/services/admin.service";
import { ItemsService } from "@shared/services/items.service";
import { GeneratedLootEntry } from "@shared/services/loot-generator.service";
import { LootService } from "@shared/services/loot.service";
import { PlayersService } from "@shared/services/players.service";
import { LootGeneratorPanelComponent } from "./loot-generator-panel.component";

/**
 * Loot do grupo — botão "LOOT" visível pra todo mundo (jogadores e Mestre),
 * igual em espírito ao `AdminDrawerComponent` mas sem gating de Mestre, já
 * que qualquer jogador pode pegar o que estiver na pilha pra si.
 */
@Component({
    selector: 'pip-loot-drawer',
    template: `
    <pip-card (click)="open.set(!open())" title="Loot do grupo" aria-label="Loot do grupo" class="
        relative px-2! py-1.5! cursor-pointer select-none hover:outline-2 hover:outline-offset-2 hover:outline-white
    ">
        <pip-icon [icon]="icons.loot" size="24" />
        @if (loot.entries().length) {
            <span class="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 flex items-center justify-center text-[10px] leading-none bg-white text-black font-black">{{ loot.entries().length }}</span>
        }
    </pip-card>
    <pip-modal title="LOOT DO GRUPO" [(open)]="open">
        @if (players.selected(); as player) {
            <p class="text-xs opacity-60 mb-2">PEGANDO PARA: {{ player.label }}</p>
        } @else {
            <p class="text-xs opacity-60 mb-2">SELECIONE UM JOGADOR EM "PARTICIPANTES" PRA PEGAR ITENS.</p>
        }
        @if (admin.isAdmin()) {
            <div class="mb-2 text-xs">
                <pip-loot-generator-panel (generated)="onGenerated($event)" />
            </div>
        }
        <div class="flex flex-col gap-1 max-h-96 overflow-auto">
            @for (entry of loot.entries(); track entry.id) {
                <div class="flex flex-row items-center gap-2 p-1 border border-white/30 text-xs">
                    <div class="flex-1 min-w-0 flex flex-col">
                        <span class="truncate">{{ itemLabel(entry) }} x{{ entry.quantity }}</span>
                        @if (entry.source) {
                            <span class="opacity-50 truncate">{{ entry.source }}</span>
                        }
                    </div>
                    <button
                        type="button"
                        class="px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
                        [disabled]="!players.selected()"
                        (click)="claim(entry)"
                    >PEGAR</button>
                </div>
            } @empty {
                <p class="opacity-60 text-xs">NENHUM LOOT DISPONÍVEL.</p>
            }
        </div>
    `,
    host: { class: 'block' },
    imports: [CardComponent, ModalComponent, LootGeneratorPanelComponent, IconComponent],
})
export class LootDrawerComponent {
    protected readonly loot = inject(LootService);
    protected readonly players = inject(PlayersService);
    protected readonly admin = inject(AdminService);
    private readonly items = inject(ItemsService);

    protected readonly open = signal(false);
    protected readonly icons = { loot: pixelarticonsBriefcase };

    protected itemLabel(entry: LootEntry): string {
        return this.items.find(entry.itemId)?.label ?? '???';
    }

    /** Jogador pega pra si; o Mestre (que não tem personagem) dá pra quem estiver selecionado em SESSÃO. */
    protected claim(entry: LootEntry): void {
        const player = this.players.me() ?? this.players.selected();
        if (player) this.loot.claim(entry.id, player.id);
    }

    protected onGenerated(entries: GeneratedLootEntry[]): void {
        this.loot.addBatch(entries, 'Loot gerado');
    }
}
