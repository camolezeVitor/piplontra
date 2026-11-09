import { Component, computed, inject } from "@angular/core";
import { TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent } from "@shared/components/tabs";
import { CardComponent } from "@shared/components/card/card.component";
import { ProgressbarComponent } from "@shared/components/progressbar/progressbar.component";
import { xpRequiredForLevel } from "@shared/models/player";
import { AdminService } from "@shared/services/admin.service";
import { PlayersService } from "@shared/services/players.service";
import { StatusComponent } from "./status/status.component";
import { SpecialComponent } from "./special/special.component";
import { PerksComponent } from "./perks/perks.component";

@Component({
    selector: "pip-stats",
    template: `
    <div class="w-full h-full flex flex-col gap-1">
        <pip-tabs activeIndex="0">
            <pip-tabs-nav showBorder="false">
                <pip-tabs-nav-item index="0">STATUS</pip-tabs-nav-item>
                <pip-tabs-nav-item index="1">SPECIAL</pip-tabs-nav-item>
                <pip-tabs-nav-item index="2">PERKS</pip-tabs-nav-item>
            </pip-tabs-nav>
            <pip-tabs-content>
                <pip-tabs-content-item index="0">
                    <pip-status />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="1">
                    <pip-special />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="2">
                    <pip-perks />
                </pip-tabs-content-item>
            </pip-tabs-content>
        </pip-tabs>
        <footer class="w-full flex flex-row gap-1">
            <pip-card class="w-1/4">HP {{ player()?.hp }}/{{ player()?.maxHp }}</pip-card>
            <pip-card class="w-2/4 flex flex-col gap-1 justify-center items-center py-1.5!">
                <div class="flex flex-row gap-3 items-center w-full justify-center">
                    <span class="text-nowrap">LEVEL {{ player()?.level }}</span>
                    <pip-progressbar class="flex-1 max-w-32" [progress]="xpPercent()" />
                </div>
                @if (admin.isAdmin()) {
                    <div class="flex flex-row items-center gap-1">
                        <input #xpInput type="number" min="1" value="50" class="field w-14 text-xs" />
                        <button
                            type="button"
                            class="px-1.5 py-0.5 text-xs border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black"
                            (click)="giveXp(xpInput.valueAsNumber)"
                        >DAR XP</button>
                    </div>
                }
            </pip-card>
            <pip-card class="w-1/4 justify-end">AP {{ player()?.ap }}/{{ player()?.maxAp }}</pip-card>
        </footer>
    </div>
    `,
    styles: `
    .field {
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        padding: 0.125rem 0.25rem;
    }
    .field:focus { border-color: white; }
    `,
    imports: [TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent, CardComponent, ProgressbarComponent, StatusComponent, SpecialComponent, PerksComponent]
})
export class StatsComponent {
    private readonly playersService = inject(PlayersService);
    protected readonly admin = inject(AdminService);

    protected readonly player = this.playersService.selected;
    protected readonly xpPercent = computed(() => {
        const player = this.player();
        if (!player) return 0;
        return Math.round((player.xp / xpRequiredForLevel(player.level)) * 100);
    });

    protected giveXp(amount: number): void {
        const player = this.player();
        if (player && Number.isFinite(amount) && amount > 0) this.playersService.addXp(player.id, amount);
    }
}