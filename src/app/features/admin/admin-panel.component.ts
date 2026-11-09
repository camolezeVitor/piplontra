import { Component, inject } from "@angular/core";
import { LegacyImportService } from "@shared/services/legacy-import.service";
import { TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent } from "@shared/components/tabs";
import { AdminQuestsComponent } from "./quests/admin-quests.component";
import { AdminItemsComponent } from "./items/admin-items.component";
import { AdminPlayersComponent } from "./players/admin-players.component";
import { AdminCraftingComponent } from "./crafting/admin-crafting.component";

@Component({
    selector: 'pip-admin-panel',
    template: `
    @if (legacy.hasData()) {
        <div class="flex flex-col gap-1 mb-3 p-2 border border-amber-400/60 text-amber-300 text-xs">
            <span>Este navegador tem dados de antes do servidor (mapa, itens, jogadores...).</span>
            <button type="button" class="self-start px-2 py-1 border border-amber-400/60 cursor-pointer hover:bg-amber-400 hover:text-black" (click)="importLegacy()">
                ENVIAR DADOS LOCAIS PRO SERVIDOR
            </button>
            <span class="opacity-70">Substitui o catálogo, quests, receitas, loot e mapa do servidor. Os jogadores antigos entram sem dono — vincule em JOGADORES.</span>
        </div>
    }
    <pip-tabs activeIndex="0">
        <pip-tabs-nav>
            <pip-tabs-nav-item index="0">QUESTS</pip-tabs-nav-item>
            <pip-tabs-nav-item index="1">ITENS</pip-tabs-nav-item>
            <pip-tabs-nav-item index="2">JOGADORES</pip-tabs-nav-item>
            <pip-tabs-nav-item index="3">CRAFTING</pip-tabs-nav-item>
        </pip-tabs-nav>
        <pip-tabs-content>
            <pip-tabs-content-item index="0">
                <pip-admin-quests />
            </pip-tabs-content-item>
            <pip-tabs-content-item index="1">
                <pip-admin-items />
            </pip-tabs-content-item>
            <pip-tabs-content-item index="2">
                <pip-admin-players />
            </pip-tabs-content-item>
            <pip-tabs-content-item index="3">
                <pip-admin-crafting />
            </pip-tabs-content-item>
        </pip-tabs-content>
    </pip-tabs>
    `,
    host: { class: 'block' },
    imports: [
        TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent,
        AdminQuestsComponent, AdminItemsComponent, AdminPlayersComponent, AdminCraftingComponent,
    ],
})
export class AdminPanelComponent {
    protected readonly legacy = inject(LegacyImportService);

    protected importLegacy(): void {
        if (!confirm('Substituir o que está no servidor pelos dados deste navegador?')) return;
        this.legacy.import().catch(() => { /* erro aparece no aviso global */ });
    }
}
