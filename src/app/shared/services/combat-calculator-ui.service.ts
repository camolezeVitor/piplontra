import { Injectable, signal } from "@angular/core";

/** Só guarda se o dialog da calculadora de combate está aberto — o cálculo em si fica em `CombatCalculatorService` (sem estado). */
@Injectable({ providedIn: 'root' })
export class CombatCalculatorUiService {
    readonly open = signal(false);

    toggle(): void {
        this.open.update(value => !value);
    }

    close(): void {
        this.open.set(false);
    }
}
