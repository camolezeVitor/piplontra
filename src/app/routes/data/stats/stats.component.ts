import { Component, signal } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { ProgressbarComponent } from "@shared/components/progressbar/progressbar.component";

type StatGroup = {
    id: number;
    label: string;
    icon: string;
    entries: { label: string; value: string; progress: number }[];
}

@Component({
    selector: "pip-data-stats",
    template: `
    <div class="flex flex-row h-full py-4 overflow-auto">
        <pip-list class="flex flex-col gap-1 w-2/5! overflow-auto">
            @for (group of groups; track group.id) {
                <pip-list-item [isActive]="isSelected(group)" class="flex flex-row items-center gap-3" (onClick)="select(group)">
                    <i [class]="group.icon" class="w-5 text-center"></i>
                    <span>{{ group.label }}</span>
                </pip-list-item>
            }
        </pip-list>
        <section class="w-3/5 px-6 flex flex-col gap-6">
            @if (selected(); as group) {
                <div class="flex justify-center">
                    <i [class]="group.icon" class="text-white/80 text-7xl pixelize"></i>
                </div>
                <div class="flex flex-col gap-3">
                    @for (entry of group.entries; track entry.label) {
                        <div class="flex flex-col gap-1">
                            <pip-card class="px-2! py-1! justify-between bg-white/10!">
                                <span>{{ entry.label }}</span>
                                <span>{{ entry.value }}</span>
                            </pip-card>
                            <pip-progressbar [progress]="entry.progress" />
                        </div>
                    }
                </div>
            }
        </section>
    </div>
    `,
    imports: [ListComponent, ListItemComponent, CardComponent, ProgressbarComponent]
})
export class DataStatsComponent {
    public groups: StatGroup[] = [
        {
            id: 0,
            label: "QUESTS",
            icon: "fa-solid fa-scroll",
            entries: [
                { label: "Completed", value: "12 / 32", progress: 38 },
                { label: "Failed", value: "2", progress: 6 },
                { label: "Active", value: "4", progress: 13 },
            ]
        },
        {
            id: 1,
            label: "EXPLORATION",
            icon: "fa-solid fa-compass",
            entries: [
                { label: "Locations discovered", value: "47 / 120", progress: 39 },
                { label: "Map markers", value: "18", progress: 15 },
                { label: "Bobbleheads", value: "7 / 20", progress: 35 },
            ]
        },
        {
            id: 2,
            label: "COMBAT",
            icon: "fa-solid fa-crosshairs",
            entries: [
                { label: "Enemies defeated", value: "386", progress: 77 },
                { label: "Critical hits", value: "42", progress: 42 },
                { label: "Weapons collected", value: "28", progress: 56 },
            ]
        },
        {
            id: 3,
            label: "CRAFTING",
            icon: "fa-solid fa-hammer",
            entries: [
                { label: "Items crafted", value: "64", progress: 64 },
                { label: "Settlements built", value: "5 / 37", progress: 14 },
                { label: "Mods installed", value: "23", progress: 46 },
            ]
        },
    ];
    public selected = signal(this.groups[0]);

    public select(group: StatGroup) { this.selected.set(group); }
    public isSelected(group: StatGroup) { return this.selected().id === group.id; }
}
