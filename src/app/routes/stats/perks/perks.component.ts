import { Component, computed, inject, signal } from "@angular/core";
import { ListComponent, ListItemComponent } from "@shared/components/list";
import { PERKS, PerkDef } from "@shared/models/perk";
import { AdminService } from "@shared/services/admin.service";
import { PlayersService } from "@shared/services/players.service";
import { TurnService } from "@shared/services/turn.service";

@Component({
    selector: "pip-perks",
    template: `
    <div class="flex flex-row h-full py-6">

        <pip-list class="flex flex-col gap-1 w-2/5! overflow-auto">
            @for (perk of perks; track perk.id) {
                <pip-list-item
                    [isActive]="isSelected(perk)"
                    class="flex flex-row justify-between items-center gap-2 cursor-pointer"
                    (onClick)="select(perk)"
                >
                    <span class="truncate">{{ perk.label }}</span>
                    <span class="shrink-0 text-xs opacity-80">{{ rankOf(perk) }}/{{ perk.maxRank }}</span>
                </pip-list-item>
            }
        </pip-list>

        <section class="w-3/5 px-6 flex flex-col gap-4">

            @if (selected(); as perk) {

                <div class="flex justify-center">
                    <i
                        [class]="perk.icon"
                        class="text-white/90 text-7xl pixelize"
                    ></i>
                </div>

                <p class="text-white text-center leading-relaxed whitespace-pre-line">
                    {{ perk.description }}
                </p>

                <p class="text-center text-xs opacity-60">RANK {{ rankOf(perk) }} / {{ perk.maxRank }}</p>

                @if (canAct() && canChoose()) {
                    @if (rankOf(perk) < perk.maxRank) {
                        <button
                            type="button"
                            class="self-center px-3 py-1 text-xs border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black"
                            (click)="choose(perk)"
                        >{{ rankOf(perk) === 0 ? 'ESCOLHER PERK' : 'AUMENTAR RANK' }} ({{ player()?.perkPoints }} DISPONÍVEL)</button>
                    } @else {
                        <p class="self-center text-xs opacity-60">RANK MÁXIMO ATINGIDO.</p>
                    }
                }
            }
        </section>

    </div>
    `,
    styles: [`
        /* Deixa o ícone com aspecto Pip-Boy pixelado */
        .pixelize {
            image-rendering: pixelated;
            filter: contrast(180%) brightness(130%);
        }
    `],
    imports: [ListComponent, ListItemComponent]
})
export class PerksComponent {
    private readonly playersService = inject(PlayersService);
    protected readonly admin = inject(AdminService);
    private readonly turn = inject(TurnService);
    protected readonly canAct = computed(() => this.turn.canAct(this.playersService.selected()));

    protected readonly perks = PERKS;
    protected readonly selected = signal<PerkDef>(PERKS[0]);
    protected readonly player = this.playersService.selected;
    protected readonly canChoose = computed(() => (this.player()?.perkPoints ?? 0) > 0);

    protected select(perk: PerkDef): void {
        this.selected.set(perk);
    }

    protected isSelected(perk: PerkDef): boolean {
        return this.selected().id === perk.id;
    }

    protected rankOf(perk: PerkDef): number {
        return this.player()?.perkRanks[perk.id] ?? 0;
    }

    protected choose(perk: PerkDef): void {
        const player = this.player();
        if (player) this.playersService.choosePerk(player.id, perk.id);
    }
}
