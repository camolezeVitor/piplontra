import { Component } from "@angular/core";
import { ProgressbarComponent } from "@shared/components/progressbar/progressbar.component";

@Component({
    selector: "pip-limbs-status",
    template: `
    <div class="flex flex-col gap-8 items-center">
        <!-- Cabeça -->
        <div class="flex w-16">
            <pip-progressbar progress="70" />
        </div>
        
        <div class="flex flex-row gap-8 justify-between items-center">
            <!-- Mão Esquerda e Pé esquerdo -->
            <div class="flex flex-col gap-16">
                <div class="flex w-16">
                    <pip-progressbar progress="40" />
                </div>
                
                <div class="flex w-16">
                    <pip-progressbar progress="10" />
                </div>
            </div>
            
            <!-- Ícone -->
            <i class="fa-solid fa-person text-7xl"></i>
            
            <!-- Mão direito e Pé direito -->
            <div class="flex flex-col gap-16">
                <div class="flex w-16">
                    <pip-progressbar progress="70" />
                </div>
                
                <div class="flex w-16">
                    <pip-progressbar progress="90" />
                </div>
            </div>
        </div>
            
        <!-- Vida Total -->
        <div class="flex w-16">
            <pip-progressbar progress="60" />
        </div>
    </div>
    `,
    imports: [ProgressbarComponent]
})
export class LimbsStatusComponent {}