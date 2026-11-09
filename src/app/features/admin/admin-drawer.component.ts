import { Component, inject, signal } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { IconComponent } from "@shared/components/icon/icon.component";
import { pixelarticonsDice } from "@ngxi/pixelarticons";
import { ModalComponent } from "@shared/components/modal/modal.component";
import { AdminService } from "@shared/services/admin.service";
import { AdminPanelComponent } from "./admin-panel.component";

/**
 * Botão "MESTRE" na header. Só aparece quando `AdminService.isAdmin` é `true`
 * — o Mestre não é um jogador, então isso nunca aparece "pra ele por engano".
 */
@Component({
    selector: 'pip-admin-drawer',
    template: `
    @if (admin.isAdmin()) {
        <pip-card (click)="open.set(!open())" title="Painel do Mestre" aria-label="Painel do Mestre" class="
            px-2! py-1.5! bg-white! outline-white text-black/50! cursor-pointer select-none
            hover:bg-white/80! hover:outline-2 hover:outline-offset-2
        ">
            <pip-icon [icon]="icons.master" size="24" />
        </pip-card>
        <pip-modal title="PAINEL DO MESTRE" size="lg" [(open)]="open">
            <pip-admin-panel />
        </pip-modal>
    }
    `,
    host: { class: 'block' },
    imports: [CardComponent, ModalComponent, AdminPanelComponent, IconComponent],
})
export class AdminDrawerComponent {
    protected readonly admin = inject(AdminService);
    protected readonly open = signal(false);
    protected readonly icons = { master: pixelarticonsDice };
}
