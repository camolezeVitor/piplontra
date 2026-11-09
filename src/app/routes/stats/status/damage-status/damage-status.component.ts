import { Component, computed, inject } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { ArmaSelecionadaUsuarioService } from "@shared/services/arma-selecionada-usuario.service";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";

@Component({
    selector: "pip-damage-status",
    template: `
    <pip-card>
        <i class="fa-solid fa-gun text-4xl"></i>
    </pip-card>
    <pip-card class="flex flex-col items-center">
        <i class="fa-solid fa-crosshairs"></i>
        {{ weaponDamage() }}
    </pip-card>
    `,
    host: {class: "flex flex-row gap-1"},
    imports: [CardComponent]
})
export class DamageStatusComponent {
    private readonly playersService = inject(PlayersService);
    private readonly itemsService = inject(ItemsService);
    private readonly armaSelecionada = inject(ArmaSelecionadaUsuarioService);

    /** Dano da arma equipada (INV > WEAPONS) pelo jogador selecionado na SESSÃO. */
    protected readonly weaponDamage = computed(() => {
        const player = this.playersService.selected();
        if (!player) return 0;
        const itemId = this.armaSelecionada.armaDoUsuario(player.id);
        return (itemId ? this.itemsService.find(itemId)?.damage : 0) ?? 0;
    });
}
