import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent } from "@shared/components/tabs";
import { AudioComponent } from "@shared/components/audio/audio.component";
import { StatsComponent } from "./routes/stats/stats.component";
import { InvComponent } from "./routes/inv/inv.component";
import { CraftingComponent } from "./routes/inv/crafting/crafting.component";
import { DataComponent } from "./routes/data/data.component";
import { PlayersPannelComponent } from 'src/app/features/players/players-pannel.component';
import { ColorFilterComponent } from '@shared/components/color-filter/color-filter.component';
import { MapComponent } from './features/map/map.component';
import { MapMasterPanelComponent } from './features/map/map-master-panel.component';
import { CombatCalculatorDialogComponent } from './features/combat-calculator/combat-calculator-dialog.component';
import { AdminService } from '@shared/services/admin.service';
import { AuthService } from '@shared/services/auth.service';
import { RealtimeService } from '@shared/services/realtime.service';
import { LoginComponent } from './features/login/login.component';
import { ChooseCharacterComponent } from './features/login/choose-character.component';
import { PlayersService } from '@shared/services/players.service';

@Component({
  selector: 'app-root',
  template: `
  <pip-audio />
  <pip-color-filter />
  <div class="w-dvw h-dvh bg-black flex flex-col items-center" style="filter: url(#pip-tint)">
    @if (!auth.isLoggedIn()) {
      <div class="h-full w-full flex justify-center items-center">
        @if (auth.connecting() && !auth.error()) {
          <p>CONECTANDO...</p>
        } @else {
          <pip-login />
        }
      </div>
    } @else if (!admin.isAdmin() && !players.me()) {
      <div class="h-full w-full flex justify-center items-center">
        <pip-choose-character />
      </div>
    } @else {
      <pip-combat-calculator-dialog />
      @if (!rt.connected()) {
        <p class="fixed top-2 z-50 px-2 py-1 text-xs bg-red-500 text-black">SEM CONEXÃO — RECONECTANDO...</p>
      } @else if (rt.error(); as error) {
        <p class="fixed top-2 z-50 px-2 py-1 text-xs bg-amber-400 text-black">{{ error }}</p>
      }
      <div class="flex-row h-full w-full flex justify-center items-center gap-4">
        <pip-players-pannel class="h-[572px] w-[320px]" />
        <div class="h-[572px] w-[572px] overflow-auto">
          <pip-tabs activeIndex="0">
            <pip-tabs-nav class="justify-evenly">
              <pip-tabs-nav-item index="0">STAT</pip-tabs-nav-item>
              <pip-tabs-nav-item index="1">INV</pip-tabs-nav-item>
              <pip-tabs-nav-item index="2">CRAFTING</pip-tabs-nav-item>
              <pip-tabs-nav-item index="3">DATA</pip-tabs-nav-item>
              <pip-tabs-nav-item index="4">MAP</pip-tabs-nav-item>
            </pip-tabs-nav>
            <pip-tabs-content>
              <pip-tabs-content-item index="0">
                <pip-stats />
              </pip-tabs-content-item>
              <pip-tabs-content-item index="1">
                <pip-inv />
              </pip-tabs-content-item>
              <pip-tabs-content-item index="2">
                <pip-crafting />
              </pip-tabs-content-item>
              <pip-tabs-content-item index="3">
                <pip-data />
              </pip-tabs-content-item>
              <pip-tabs-content-item index="4">
                <pip-map />
              </pip-tabs-content-item>
            </pip-tabs-content>
          </pip-tabs>
        </div>
        @if (admin.isAdmin()) {
          <pip-map-master-panel class="h-[572px] w-[320px]" />
        }
      </div>
    }
  </div>
  `,
  imports: [RouterOutlet, TabsComponent, TabsNavComponent, TabsNavItemComponent, TabsContentComponent, TabsContentItemComponent, AudioComponent, StatsComponent, InvComponent, CraftingComponent, DataComponent, PlayersPannelComponent, ColorFilterComponent, MapComponent, MapMasterPanelComponent, CombatCalculatorDialogComponent, LoginComponent, ChooseCharacterComponent],
})
export class App {
  protected readonly title = signal('piplontra');
  protected readonly admin = inject(AdminService);
  protected readonly auth = inject(AuthService);
  protected readonly rt = inject(RealtimeService);
  protected readonly players = inject(PlayersService);
}
