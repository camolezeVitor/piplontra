import { Component } from "@angular/core";
import { LimbsStatusComponent } from "./limbs-status/limbs-status.component";
import { DamageStatusComponent } from "./damage-status/damage-status.component";
import { DefenseStatusComponent } from "./defense-status/defense-status.component";
import { UseStimpackComponent } from "./use-stimpack/use-stimpack.component";
import { UseRadawayComponent } from "./use-radaway/use-radaway.component";

@Component({
    selector: "pip-status",
    template: `
    <div class="w-full flex flex-col items-center justify-center gap-12 py-6">
        <pip-limbs-status />
        <div class="flex flex-row gap-8">
            <pip-damage-status />
            <pip-defense-status />
        </div>
        <div class="flex flex-row gap-8">
            <pip-use-stimpack />
            <pip-use-radaway />
        </div>
    </div>
    `,
    imports: [LimbsStatusComponent, DamageStatusComponent, DefenseStatusComponent, UseStimpackComponent, UseRadawayComponent]
})
export class StatusComponent {}