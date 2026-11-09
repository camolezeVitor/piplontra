import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { SPECIAL_STATS, SpecialStatDef } from "@shared/models/special";
import { AdminService } from "@shared/services/admin.service";
import { PlayersService } from "@shared/services/players.service";
import { TurnService } from "@shared/services/turn.service";

@Component({
    selector: "pip-special",
    template: `
    <div class="flex flex-row h-full py-6">
        <pip-list class="flex flex-col gap-1 w-2/5!">
            @for (stat of stats; track stat.value) {
                <pip-list-item
                    [isActive]="isSelected(stat)"
                    class="flex flex-row justify-between items-center gap-2"
                    (onClick)="select(stat)"
                >
                    <span>{{ stat.label }}</span>
                    <span class="flex items-center gap-1.5">
                        @if (admin.isAdmin()) {
                            <!-- Mestre define o valor direto (1..10), sem gastar pontos. -->
                            <button
                                type="button"
                                class="px-1.5 text-xs border border-white/40 cursor-pointer hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                                [disabled]="valueOf(stat) <= 1"
                                (click)="$event.stopPropagation(); setValue(stat, valueOf(stat) - 1)"
                                title="Diminuir"
                            >−</button>
                            <span class="w-5 text-center">{{ valueOf(stat) }}</span>
                            <button
                                type="button"
                                class="px-1.5 text-xs border border-white/40 cursor-pointer hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                                [disabled]="valueOf(stat) >= 10"
                                (click)="$event.stopPropagation(); setValue(stat, valueOf(stat) + 1)"
                                title="Aumentar"
                            >+</button>
                        } @else {
                            {{ valueOf(stat) }}
                            @if (canAllocate() && canAct()) {
                                <button
                                    type="button"
                                    class="px-1.5 text-xs border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black"
                                    (click)="$event.stopPropagation(); allocate(stat)"
                                    title="Gastar 1 ponto de SPECIAL"
                                >+1</button>
                            }
                        }
                    </span>
                </pip-list-item>
            }
        </pip-list>

        <section class="w-3/5 px-6 flex flex-col gap-6">
            @if (selected(); as stat) {
                <div class="flex justify-center">
                    <i [class]="stat.icon" class="text-white/80 text-7xl pixelize"></i>
                </div>

                <p class="text-white text-center leading-relaxed whitespace-pre-line">
                    {{ stat.description }}
                </p>

                @if (admin.isAdmin()) {
                    @if (player(); as p) {
                        <label class="self-center flex items-center gap-2 text-xs">
                            <span class="opacity-80">PONTOS LIVRES DE {{ p.label }}:</span>
                            <input
                                class="w-14 bg-transparent text-center border border-white/40 px-1"
                                type="number" min="0"
                                [value]="p.specialPoints"
                                (change)="setPoints($any($event.target).valueAsNumber)"
                            />
                        </label>
                    }
                } @else if (canAllocate() && canAct()) {
                    <p class="text-center text-xs text-lime-400">
                        {{ player()?.specialPoints }} PONTO(S) DE SPECIAL DISPONÍVEL — CLIQUE EM "+1" NA LISTA.
                    </p>
                }
            }
        </section>
    </div>
    `,
    styles: [`
        .pixelize {
            image-rendering: pixelated;
            filter: contrast(180%) brightness(130%);
        }
    `],
    imports: [ListComponent, ListItemComponent]
})
export class SpecialComponent {
    private readonly playersService = inject(PlayersService);
    protected readonly admin = inject(AdminService);
    private readonly turn = inject(TurnService);
    protected readonly canAct = computed(() => this.turn.canAct(this.playersService.selected()));

    protected readonly stats = SPECIAL_STATS;
    protected readonly selected = signal<SpecialStatDef>(SPECIAL_STATS[0]);
    protected readonly player = this.playersService.selected;
    protected readonly canAllocate = computed(() => (this.player()?.specialPoints ?? 0) > 0);

    protected select(stat: SpecialStatDef): void {
        this.selected.set(stat);
    }

    protected isSelected(stat: SpecialStatDef): boolean {
        return this.selected().value === stat.value;
    }

    protected valueOf(stat: SpecialStatDef): number {
        return this.player()?.special[stat.value] ?? 0;
    }

    protected setValue(stat: SpecialStatDef, value: number): void {
        const player = this.player();
        if (player) this.playersService.setSpecial(player.id, stat.value, value);
    }

    protected setPoints(value: number): void {
        const player = this.player();
        if (player && Number.isFinite(value)) this.playersService.setSpecialPoints(player.id, value);
    }

    protected allocate(stat: SpecialStatDef): void {
        const player = this.player();
        if (player) this.playersService.allocateSpecialPoint(player.id, stat.value);
    }
}
