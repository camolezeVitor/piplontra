import { Component, signal } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { IconComponent } from "@shared/components/icon/icon.component";
import { pixelarticonsSliders } from "@ngxi/pixelarticons";
import { DrawerComponent } from "@shared/components/drawer/drawer.component";
import { ModalComponent } from "@shared/components/modal/modal.component";
import { UserConfigsComponent } from "./user-configs.component";

@Component({
    selector: 'pip-configs-drawer',
    template: `
    <pip-card (click)="userModalOpen.set(!userModalOpen())" title="Configurações do usuário" aria-label="Configurações do usuário" class="
        px-2! py-1.5! bg-white! outline-white text-black/50! cursor-pointer select-none
        hover:bg-white/80! hover:outline-2 hover:outline-offset-2
    ">
        <pip-icon [icon]="icons.configs" size="24" />
    </pip-card>
    <pip-modal title="USUÁRIO" [(open)]="userModalOpen">
        <pip-user-configs />
    </pip-modal>
    `,
    host: { class: 'block' },
    imports: [DrawerComponent, CardComponent, ModalComponent, UserConfigsComponent, IconComponent]
})
export class ConfigsDrawerComponent {
    readonly userModalOpen = signal(false);
    protected readonly icons = { configs: pixelarticonsSliders };
}
