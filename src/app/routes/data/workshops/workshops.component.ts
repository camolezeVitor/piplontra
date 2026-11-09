import { Component, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { CardComponent } from "@shared/components/card/card.component";

type Workshop = {
    id: number;
    label: string;
    population: number;
    capacity: number;
    food: number;
    water: number;
    defense: number;
    beds: number;
    status: string;
}

@Component({
    selector: "pip-workshops",
    template: `
    <div class="flex flex-row h-full py-4 overflow-auto">
        <pip-list class="flex flex-col gap-1 w-2/5! overflow-auto">
            @for (workshop of workshops; track workshop.id) {
                <pip-list-item [isActive]="isSelected(workshop)" class="flex flex-row justify-between items-center" (onClick)="select(workshop)">
                    <span>{{ workshop.label }}</span>
                    <span class="text-xs">{{ workshop.population }}/{{ workshop.capacity }}</span>
                </pip-list-item>
            }
        </pip-list>
        <section class="w-3/5 px-6 flex flex-col gap-6">
            @if (selected()) {
                <div class="flex justify-center">
                    <i class="text-white/80 fa-solid fa-house-chimney text-7xl pixelize"></i>
                </div>
                <div class="flex flex-col gap-1">
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Population</span>
                        <span>{{ selected().population }}/{{ selected().capacity }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Food</span>
                        <span>{{ selected().food }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Water</span>
                        <span>{{ selected().water }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Defense</span>
                        <span>{{ selected().defense }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Beds</span>
                        <span>{{ selected().beds }}</span>
                    </pip-card>
                    <pip-card class="px-2! py-1! justify-between bg-white/10!">
                        <span>Status</span>
                        <span>{{ selected().status }}</span>
                    </pip-card>
                </div>
            }
        </section>
    </div>
    `,
    imports: [ListComponent, ListItemComponent, CardComponent]
})
export class WorkshopsComponent {
    public workshops: Workshop[] = [
        { id: 0, label: "Sanctuary", population: 12, capacity: 18, food: 24, water: 30, defense: 42, beds: 14, status: "HAPPY" },
        { id: 1, label: "Red Rocket", population: 4, capacity: 6, food: 8, water: 12, defense: 18, beds: 5, status: "HAPPY" },
        { id: 2, label: "Abernathy Farm", population: 9, capacity: 12, food: 36, water: 10, defense: 28, beds: 9, status: "CONTENT" },
        { id: 3, label: "The Castle", population: 8, capacity: 24, food: 20, water: 20, defense: 65, beds: 10, status: "HAPPY" },
        { id: 4, label: "Starlight Drive-In", population: 6, capacity: 10, food: 12, water: 16, defense: 24, beds: 6, status: "CONTENT" },
    ];
    public selected = signal(this.workshops[0]);
    public select(workshop: Workshop) { this.selected.set(workshop); }
    public isSelected(workshop: Workshop) { return this.selected().id === workshop.id; }
}