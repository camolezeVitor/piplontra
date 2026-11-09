import { Component, inject, signal } from "@angular/core";
import { OutlineDirective } from "@shared/directives/outline/outline.directive";
import { ListComponent, ListItemComponent } from "../../shared/components/list";
import { TitleDirective } from "@shared/directives/text/title.directive";
import { CardComponent } from "@shared/components/card/card.component";
import { IconComponent } from "@shared/components/icon/icon.component";
import { pixelarticonsEdit, pixelarticonsHourglass, pixelarticonsLock, pixelarticonsLogout, pixelarticonsPlay } from "@ngxi/pixelarticons";
import { PopoverComponent } from "@shared/components/popover/popover.component";
import { AvailableAudios, AudioService } from "@shared/components/audio/audio.service";
import { Player } from "@shared/models/player";
import { AdminService } from "@shared/services/admin.service";
import { AuthService } from "@shared/services/auth.service";
import { ArmaSelecionadaUsuarioService } from "@shared/services/arma-selecionada-usuario.service";
import { BloodEffectService } from "@shared/services/blood-effect.service";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";
import { RoupaSelecionadaUsuarioService } from "@shared/services/roupa-selecionada-usuario.service";
import { AdminDrawerComponent } from "../admin/admin-drawer.component";
import { ConfigsDrawerComponent } from "../header/configs/configs-drawer.component";
import { LootDrawerComponent } from "../loot/loot-drawer.component";
import { SwitchCharacterComponent } from "../login/switch-character.component";
import { TurnBarComponent } from "./turn-bar.component";
import { TurnService } from "@shared/services/turn.service";

type AdjustableStat = 'hp' | 'ap' | 'rads' | 'coins' | 'xp';

@Component({
    selector: 'pip-players-pannel',
    template: `
    <div pipOutline class="flex flex-col gap-1 h-full overflow-auto">
        <header class="flex flex-col gap-2 py-2 px-3 border-b border-white">
            <p pipTitle>SESSÃO</p>
            <div class="flex flex-row flex-wrap items-center gap-2">
                <pip-card class="
                    px-2! py-1.5! bg-white! outline-white text-black/50! cursor-pointer select-none
                    hover:bg-white/80! hover:outline-2 hover:outline-offset-2
                " (click)="auth.logout()" title="Sair" aria-label="Sair">
                    <pip-icon [icon]="icons.exit" size="24" />
                </pip-card>
                <pip-loot-drawer />
                @if (!admin.isAdmin()) {
                    <pip-switch-character />
                }
                <pip-admin-drawer />
                <pip-configs-drawer />
            </div>
            <pip-turn-bar />
        </header>
        <pip-list class="flex flex-col gap-1 w-full overflow-auto p-2!">
            @for (player of players(); track player.id) {
                <pip-list-item
                    [isActive]="selected()?.id === player.id"
                    class="flex flex-row gap-3 items-center"
                    [style.cursor]="playersService.canSelect(player) ? null : 'not-allowed'"
                    [title]="playersService.canSelect(player) ? '' : 'Só o dono e o Mestre abrem o Pip-Boy desse personagem'"
                    (onClick)="select(player)"
                >
                    <img
                        [src]="player.image || '/players/ex1.png'"
                        [alt]="player.label"
                        class="w-12 h-12 shrink-0 object-cover object-top border border-white/70"
                        style="image-rendering: pixelated"
                    />
                    <div class="min-w-0 flex-1 flex flex-col gap-1">
                        <div class="flex flex-row items-center justify-between gap-2">
                            <span class="flex flex-row items-center gap-1.5 min-w-0">
                                <span class="shrink-0 size-2.5 rounded-full border border-white/50" [style.background-color]="player.color"></span>
                                <span class="truncate">{{ player.label }}</span>
                            </span>
                            @if (player.userId && player.userId === me()?.id) {
                                <span class="shrink-0 text-xs bg-white text-black px-1">VOCÊ</span>
                            } @else if (!player.userId && admin.isAdmin()) {
                                <span class="shrink-0 text-xs border border-white/50 px-1 opacity-70">SEM DONO</span>
                            } @else if (!playersService.canSelect(player)) {
                                <pip-icon [icon]="icons.lock" size="24" class="opacity-60" />
                            }
                        </div>
                        @if (turn.turn().playerId === player.id) {
                            <span class="self-start flex items-center px-0.5 bg-lime-400 text-black" title="No turno" aria-label="No turno"><pip-icon [icon]="icons.turn" size="24" /></span>
                        } @else if (admin.isAdmin()) {
                            <button
                                type="button"
                                class="self-start flex items-center px-0.5 border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black"
                                (click)="$event.stopPropagation(); turn.setTurn(player.id)"
                                title="Dar o turno pra esse personagem" aria-label="Dar o turno pra esse personagem"
                            ><pip-icon [icon]="icons.giveTurn" size="24" /></button>
                        }
                        <div class="grid grid-cols-2 gap-x-2 text-xs">
                            <span>HP {{ player.hp }}/{{ player.maxHp }}</span>
                            <span>AP {{ player.ap }}/{{ player.maxAp }}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-x-2 text-xs">
                            <span>RADS {{ player.rads }}</span>
                            <span>CAPS {{ player.coins }}</span>
                        </div>
                        <span class="truncate text-xs opacity-80">ARMA: {{ equippedWeaponLabel(player) }}</span>
                        <span class="truncate text-xs opacity-80">ROUPAS: {{ equippedApparelLabel(player) }}</span>
                        @if (admin.isAdmin()) {
                            <div class="pt-0.5" (click)="$event.stopPropagation()">
                                <button
                                    #configBtn
                                    type="button"
                                    class="flex items-center px-1 py-0.5 border border-white/40 cursor-pointer hover:bg-white hover:text-black"
                                    title="Ajustar HP, AP, RADS, CAPS e XP" aria-label="Ajustar HP, AP, RADS, CAPS e XP"
                                    (click)="configOpenId.set(player.id)"
                                ><pip-icon [icon]="icons.edit" size="24" /></button>
                                <pip-popover
                                    [open]="configOpenId() === player.id"
                                    (openChange)="$event ? configOpenId.set(player.id) : configOpenId.set(null)"
                                    [anchor]="configBtn"
                                >
                                    <div class="flex flex-col gap-1.5 w-64 text-xs">
                                        <p class="font-black opacity-80 truncate">{{ player.label }}</p>
                                        @for (stat of adjustableStats; track stat.key) {
                                            <div class="flex flex-row items-center gap-1">
                                                <span class="w-10 shrink-0 font-black">{{ stat.label }}</span>
                                                <span class="w-16 shrink-0 opacity-70 truncate">{{ statValue(player, stat.key) }}</span>
                                                <input #amount type="number" min="1" [value]="stat.step" class="field w-12 min-w-0" />
                                                <button
                                                    type="button"
                                                    class="px-2 py-0.5 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black"
                                                    [title]="'Tirar ' + stat.label"
                                                    (click)="adjust(player, stat.key, -amount.valueAsNumber, $event)"
                                                >−</button>
                                                <button
                                                    type="button"
                                                    class="px-2 py-0.5 border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black"
                                                    [title]="'Dar ' + stat.label"
                                                    (click)="adjust(player, stat.key, amount.valueAsNumber, $event)"
                                                >+</button>
                                            </div>
                                        }
                                    </div>
                                </pip-popover>
                            </div>
                        }
                    </div>
                </pip-list-item>
            }
        </pip-list>
    </div>
    `,
    styles: `
    .field {
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        padding: 0.125rem 0.25rem;
    }
    .field:focus { border-color: white; }
    `,
    imports: [OutlineDirective, ListComponent, ListItemComponent, TitleDirective, CardComponent, PopoverComponent, AdminDrawerComponent, ConfigsDrawerComponent, LootDrawerComponent, SwitchCharacterComponent, TurnBarComponent, IconComponent]
})
export class PlayersPannelComponent {
    protected readonly playersService = inject(PlayersService);
    private readonly audio = inject(AudioService);
    private readonly bloodEffect = inject(BloodEffectService);
    private readonly armaSelecionada = inject(ArmaSelecionadaUsuarioService);
    private readonly roupaSelecionada = inject(RoupaSelecionadaUsuarioService);
    private readonly items = inject(ItemsService);
    protected readonly admin = inject(AdminService);
    protected readonly auth = inject(AuthService);
    protected readonly turn = inject(TurnService);
    protected readonly icons = {
        exit: pixelarticonsLogout, lock: pixelarticonsLock, turn: pixelarticonsHourglass,
        giveTurn: pixelarticonsPlay, edit: pixelarticonsEdit,
    };
    protected readonly me = this.auth.me;

    readonly players = this.playersService.players;
    readonly selected = this.playersService.selected;
    /** Qual jogador tem o popover de configuração (DANO/RADS/CAPS) aberto no momento. */
    protected readonly configOpenId = signal<string | null>(null);

    select(player: Player) {
        if (this.playersService.canSelect(player)) this.playersService.select(player.id);
    }

    /** Arma equipada de verdade (INV > WEAPONS); cai pro texto livre antigo se nada foi equipado ainda. */
    protected equippedWeaponLabel(player: Player): string {
        const itemId = this.armaSelecionada.armaDoUsuario(player.id);
        const item = itemId ? this.items.find(itemId) : undefined;
        return item?.label ?? player.weapon ?? '—';
    }

    /** Atributos que o Mestre ajusta no popover CONFIGURAR (− tira, + dá). */
    protected readonly adjustableStats: { key: AdjustableStat; label: string; step: number }[] = [
        { key: 'hp', label: 'HP', step: 10 },
        { key: 'ap', label: 'AP', step: 10 },
        { key: 'rads', label: 'RADS', step: 10 },
        { key: 'coins', label: 'CAPS', step: 10 },
        { key: 'xp', label: 'XP', step: 50 },
    ];

    protected statValue(player: Player, key: AdjustableStat): string {
        switch (key) {
            case 'hp': return `${player.hp}/${player.maxHp}`;
            case 'ap': return `${player.ap}/${player.maxAp}`;
            case 'rads': return `${player.rads}`;
            case 'coins': return `${player.coins}`;
            case 'xp': return `${player.xp} · LV${player.level}`;
        }
    }

    /** `amount` já vem com sinal: negativo tira, positivo dá. */
    protected adjust(player: Player, key: AdjustableStat, amount: number, event: MouseEvent): void {
        if (!Number.isFinite(amount) || amount === 0) return;
        switch (key) {
            case 'hp':
                this.playersService.adjustHp(player.id, amount);
                if (amount < 0) {
                    this.audio.playInstantAudio(AvailableAudios.PipboyDamage);
                    this.bloodEffect.burst(event.clientX, event.clientY);
                }
                break;
            case 'ap': this.playersService.adjustAp(player.id, amount); break;
            case 'rads': this.playersService.adjustRads(player.id, amount); break;
            case 'coins': this.playersService.adjustCoins(player.id, amount); break;
            case 'xp': this.playersService.adjustXp(player.id, amount); break;
        }
    }

    /** Resumo das roupas equipadas (um item por slot) — ver `RoupaSelecionadaUsuarioService`. */
    protected equippedApparelLabel(player: Player): string {
        const equipped = Object.values(this.roupaSelecionada.equipamentos(player.id));
        const labels = equipped
            .filter((itemId): itemId is string => !!itemId)
            .map(itemId => this.items.find(itemId)?.label)
            .filter((label): label is string => !!label);
        return labels.length ? labels.join(', ') : '—';
    }
}
