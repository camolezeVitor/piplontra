import { Component, computed, inject } from "@angular/core";
import { TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent } from "@shared/components/tabs";
import { CardComponent } from "@shared/components/card/card.component";
import { ProgressbarComponent } from "@shared/components/progressbar/progressbar.component";
import { PlayersService } from "@shared/services/players.service";
import { ItemsService } from "@shared/services/items.service";
import { WeaponsComponent } from "./weapons/weapons.component";
import { ApparelComponent } from "./apparel/apparel.component";
import { AidComponent } from "./aid/aid.component";
import { AmmoComponent } from "./ammo/ammo.component";
import { JunkComponent } from "./junk/junk.component";
import { MiscComponent } from "./misc/misc.component";
import { ModsComponent } from "./mods/mods.component";

@Component({
    selector: "pip-inv",
    template: `
    <div class="w-full h-full flex flex-col gap-1 overflow-auto">
        <pip-tabs activeIndex="0">
            <pip-tabs-nav showBorder="false">
                <pip-tabs-nav-item index="0">WEAPONS</pip-tabs-nav-item>
                <pip-tabs-nav-item index="1">APPAREL</pip-tabs-nav-item>
                <pip-tabs-nav-item index="2">AID</pip-tabs-nav-item>
                <pip-tabs-nav-item index="3">MISC</pip-tabs-nav-item>
                <pip-tabs-nav-item index="4">JUNK</pip-tabs-nav-item>
                <pip-tabs-nav-item index="5">MODS</pip-tabs-nav-item>
                <pip-tabs-nav-item index="6">AMMO</pip-tabs-nav-item>
            </pip-tabs-nav>
            <pip-tabs-content>
                <pip-tabs-content-item index="0">
                    <pip-weapons />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="1">
                    <pip-apparel />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="2">
                    <pip-aid />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="3">
                    <pip-misc />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="4">
                    <pip-junk />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="5">
                    <pip-mods />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="6">
                    <pip-ammo />
                </pip-tabs-content-item>
            </pip-tabs-content>
        </pip-tabs>
        <footer class="w-full flex flex-row gap-1">
            <pip-card class="w-1/4 flex flex-row gap-2 items-center" [class.text-red-400]="overweight()">
                <i class="fa-solid fa-weight-hanging"></i>
                {{ totalWeight().toFixed(1) }}/{{ carryCapacity() }}
            </pip-card>
            <pip-card class="w-1/4 flex flex-row gap-2 items-center">
                <i class="fa-solid fa-coins"></i>
                {{ me()?.coins ?? 0 }}
            </pip-card>
            <pip-card class="w-2/4 flex flex-row gap-3 justify-end items-center">
                <i class="fa-solid fa-gun"></i>
                <span class="flex flex-row items-center gap-2" title="Dano da arma equipada">
                    {{ weaponDamage() ?? '—' }}
                    <i class="fa-solid fa-crosshairs"></i>
                </span>
            </pip-card>
        </footer>
    </div>
    `,
    imports: [TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent, CardComponent, ProgressbarComponent, WeaponsComponent, ApparelComponent, AidComponent, AmmoComponent, JunkComponent, MiscComponent, ModsComponent]
})
export class InvComponent {
    private readonly playersService = inject(PlayersService);
    private readonly itemsService = inject(ItemsService);

    protected readonly me = computed(() => this.playersService.selected());
    protected readonly totalWeight = computed(() => {
        const player = this.me();
        return player ? this.playersService.totalWeight(player.id) : 0;
    });
    protected readonly carryCapacity = computed(() => {
        const player = this.me();
        return player ? this.playersService.carryCapacity(player.id) : 0;
    });
    protected readonly overweight = computed(() => this.totalWeight() > this.carryCapacity());
    /** Dano da arma equipada (null = desarmado) — antes era um "18" fixo. */
    protected readonly weaponDamage = computed(() => {
        const weaponId = this.me()?.equippedWeaponId;
        return weaponId ? this.itemsService.find(weaponId)?.damage ?? null : null;
    });
}