import { Component, computed, inject } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";
import { RoupaSelecionadaUsuarioService } from "@shared/services/roupa-selecionada-usuario.service";

@Component({
    selector: "pip-defense-status",
    template: `
    <pip-card>
        <i class="fa-solid fa-user-shield text-4xl"></i>
    </pip-card>

    <!-- DEF: soma de resistência a dano das roupas equipadas -->
    <pip-card class="flex flex-col items-center">
        <i class="fa-solid fa-shield-halved"></i>
        {{ totalDr() }}
    </pip-card>

    <!-- AP: pontos de ação restantes do jogador -->
    <pip-card class="flex flex-col items-center">
        <i class="fa-solid fa-bolt"></i>
        {{ ap() }}
    </pip-card>

    <!-- RAD: soma de resistência a radiação das roupas equipadas -->
    <pip-card class="flex flex-col items-center">
        <i class="fa-solid fa-radiation"></i>
        {{ totalRr() }}
    </pip-card>
    `,
    host: { class: "flex flex-row gap-1"},
    imports: [CardComponent]
})
export class DefenseStatusComponent {
    private readonly playersService = inject(PlayersService);
    private readonly itemsService = inject(ItemsService);
    private readonly roupaSelecionada = inject(RoupaSelecionadaUsuarioService);

    protected readonly ap = computed(() => this.playersService.selected()?.ap ?? 0);

    /** Itens de roupa equipados (um por slot) pelo jogador selecionado na SESSÃO. */
    private readonly equippedApparel = computed(() => {
        const player = this.playersService.selected();
        if (!player) return [];
        const equipped = this.roupaSelecionada.equipamentos(player.id);
        return Object.values(equipped)
            .filter((itemId): itemId is string => !!itemId)
            .map(itemId => this.itemsService.find(itemId))
            .filter((item): item is NonNullable<typeof item> => !!item);
    });

    protected readonly totalDr = computed(() => this.equippedApparel().reduce((sum, item) => sum + (item.dr ?? 0), 0));
    protected readonly totalRr = computed(() => this.equippedApparel().reduce((sum, item) => sum + (item.rr ?? 0), 0));
}
