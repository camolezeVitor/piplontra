import { Component } from "@angular/core";
import { TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent } from "@shared/components/tabs";
import { CardComponent } from "@shared/components/card/card.component";
import { QuestsComponent } from "./quests/quests.component";
import { DataStatsComponent } from "./stats/stats.component";
import { WorkshopsComponent } from "./workshops/workshops.component";

@Component({
    selector: "pip-data",
    template: `
    <div class="w-full h-full flex flex-col gap-1 overflow-auto">
        <pip-tabs activeIndex="0">
            <pip-tabs-nav showBorder="false">
                <pip-tabs-nav-item index="0">QUESTS</pip-tabs-nav-item>
                <pip-tabs-nav-item index="1">WORKSHOPS</pip-tabs-nav-item>
                <pip-tabs-nav-item index="2">STATS</pip-tabs-nav-item>
            </pip-tabs-nav>
            <pip-tabs-content>
                <pip-tabs-content-item index="0">
                    <pip-quests />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="1">
                    <pip-workshops />
                </pip-tabs-content-item>
                <pip-tabs-content-item index="2">
                    <pip-data-stats />
                </pip-tabs-content-item>
            </pip-tabs-content>
        </pip-tabs>
        <footer class="w-full flex flex-row gap-1">
            <pip-card class="w-1/4 flex flex-row gap-2 items-center">
                10.05.2243
            </pip-card>
            <pip-card class="w-1/4 flex flex-row gap-2 items-center">
                14:30
            </pip-card>
            <pip-card class="w-2/4 flex flex-row gap-3 justify-end items-center">
            </pip-card>
        </footer>
    </div>
    `,
    imports: [TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent, CardComponent, QuestsComponent, DataStatsComponent, WorkshopsComponent]
})
export class DataComponent {}