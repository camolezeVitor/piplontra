import { Component, ElementRef, OnDestroy, inject, signal } from "@angular/core";
import {
    BODY_PARTS, BodyPart, COMBAT_ACTIONS, CombatAction, CombatCalculationResult, CombatModifier,
} from "@shared/models/combat-calculator";
import { Special, SPECIAL_STATS, SpecialStat, createDefaultSpecial } from "@shared/models/special";
import { ArmaSelecionadaUsuarioService } from "@shared/services/arma-selecionada-usuario.service";
import { CombatCalculatorUiService } from "@shared/services/combat-calculator-ui.service";
import { CombatCalculatorService } from "@shared/services/combat-calculator.service";
import { ItemsService } from "@shared/services/items.service";
import { PlayersService } from "@shared/services/players.service";

/**
 * Dialog flutuante da calculadora de combate — canto inferior direito, sem
 * modal (não escurece/bloqueia o resto da tela). Host movido pro `<body>`,
 * mesmo motivo do `ModalComponent`/`PopoverComponent`: escapar do
 * `filter: url(#pip-tint)` do app, que quebra `position: fixed` em
 * descendentes. Fica montado globalmente (`app.ts`) e só se renderiza
 * quando `CombatCalculatorUiService.open()` está true.
 */
@Component({
    selector: 'pip-combat-calculator-dialog',
    template: `
    @if (ui.open()) {
        <div class="fixed bottom-2 right-2 z-200 bg-black text-white border border-white p-3 flex flex-col gap-2 text-xs w-80 max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain">
            <div class="flex flex-row items-center justify-between">
                <span class="font-black">CALCULADORA DE COMBATE</span>
                <button type="button" class="cursor-pointer px-1 hover:bg-white hover:text-black" aria-label="Fechar" (click)="ui.close()">X</button>
            </div>

            <label class="flex flex-col gap-1">
                <span class="opacity-80">AÇÃO</span>
                <select class="field" [value]="action()" (change)="setAction($any($event.target).value)">
                    @for (a of actions; track a.value) {
                        <option [value]="a.value">{{ a.label }}</option>
                    }
                </select>
            </label>

            <label class="flex flex-col gap-1">
                <span class="opacity-80">D20</span>
                <input class="field" type="number" min="1" max="20" [value]="d20()" (input)="d20.set(number($event))" />
            </label>

            <div class="flex flex-col gap-1">
                <div class="flex flex-row items-center justify-between">
                    <span class="opacity-80">SPECIAL</span>
                    <button type="button" class="underline opacity-80 hover:opacity-100 cursor-pointer" (click)="prefillSpecial()">USAR DO JOGADOR SELECIONADO</button>
                </div>
                <div class="grid grid-cols-4 gap-1">
                    @for (stat of specialStats; track stat.value) {
                        <label class="flex flex-col items-center gap-0.5">
                            <span class="opacity-60 text-[9px]">{{ stat.label.slice(0, 3) }}</span>
                            <input class="field w-full text-center" type="number" min="1" max="10" [value]="special()[stat.value]" (input)="updateSpecial(stat.value, number($event))" />
                        </label>
                    }
                </div>
            </div>

            @if (action() === 'shoot') {
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">PARTE DO CORPO</span>
                    <select class="field" [value]="bodyPart()" (change)="bodyPart.set($any($event.target).value)">
                        @for (part of bodyParts; track part.value) {
                            <option [value]="part.value">{{ part.label }}</option>
                        }
                    </select>
                </label>
            }

            @if (action() === 'shoot' || action() === 'hit' || action() === 'heavy_attack') {
                <div class="flex flex-row items-end gap-1">
                    <label class="flex flex-col gap-1 flex-1">
                        <span class="opacity-80">DANO BASE</span>
                        <input class="field" type="number" min="0" [value]="baseDamage()" (input)="baseDamage.set(number($event))" />
                    </label>
                    @if (action() === 'shoot') {
                        <button type="button" class="px-2 py-1 border border-white/40 cursor-pointer hover:bg-white hover:text-black" title="Preencher com a arma equipada pelo jogador selecionado" (click)="prefillWeapon()">ARMA</button>
                    }
                </div>
            }

            @if (action() === 'shoot') {
                <div class="flex flex-row gap-1">
                    <label class="flex flex-col gap-1 flex-1">
                        <span class="opacity-80">DISTÂNCIA</span>
                        <input class="field" type="number" min="0" [value]="distance() ?? ''" (input)="distance.set(number($event))" />
                    </label>
                    <label class="flex flex-col gap-1 flex-1">
                        <span class="opacity-80">ALCANCE DA ARMA</span>
                        <input class="field" type="number" min="0" [value]="weaponRange() ?? ''" (input)="weaponRange.set(number($event))" />
                    </label>
                </div>
            }

            @if (action() === 'hit' || action() === 'heavy_attack') {
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">TIPO DE ATAQUE (OPCIONAL)</span>
                    <input class="field" type="text" [value]="attackType()" (input)="attackType.set($any($event.target).value)" />
                </label>
            }

            @if (action() === 'use_item') {
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">ITEM</span>
                    <input class="field" type="text" [value]="itemLabel()" (input)="itemLabel.set($any($event.target).value)" />
                </label>
            }

            @if (action() === 'inspect' || action() === 'stealth') {
                <label class="flex flex-col gap-1">
                    <span class="opacity-80">DIFICULDADE (OPCIONAL)</span>
                    <input class="field" type="number" min="1" [value]="difficulty() ?? ''" (input)="difficulty.set(number($event))" />
                </label>
            }

            <div class="flex flex-col gap-1 pt-1 border-t border-white/20">
                <span class="opacity-80">MODIFICADORES</span>
                <div class="flex flex-row gap-1">
                    <input class="field flex-1 min-w-0" type="text" placeholder="NOME" [value]="modifierLabel()" (input)="modifierLabel.set($any($event.target).value)" />
                    <input class="field w-14" type="number" [value]="modifierValue()" (input)="modifierValue.set(number($event))" />
                    <button type="button" class="px-2 border border-white/40 cursor-pointer hover:bg-white hover:text-black" (click)="addModifier()">+</button>
                </div>
                <div class="flex flex-col gap-1 max-h-20 overflow-auto">
                    @for (modifier of modifiers(); track $index) {
                        <div class="flex flex-row items-center gap-1">
                            <span class="flex-1 truncate">{{ modifier.label }}: {{ modifier.value >= 0 ? '+' : '' }}{{ modifier.value }}</span>
                            <button type="button" class="px-1 border border-red-500/60 text-red-400 cursor-pointer hover:bg-red-500 hover:text-black" (click)="removeModifier($index)">✕</button>
                        </div>
                    } @empty {
                        <span class="opacity-50">SEM MODIFICADORES.</span>
                    }
                </div>
            </div>

            <button type="button" class="px-2 py-1.5 border border-lime-500/60 text-lime-400 cursor-pointer hover:bg-lime-500 hover:text-black font-black" (click)="calculate()">
                CALCULAR
            </button>

            @if (result(); as res) {
                <div class="flex flex-col gap-1 pt-2 border-t border-white/20">
                    @if (res.ok) {
                        <span class="font-black" [class.text-lime-400]="res.outcome === 'hit'" [class.text-red-400]="res.outcome === 'miss'">
                            {{ res.outcome === 'hit' ? 'ACERTO' : 'MISS' }}{{ res.bodyPart ? ' — ' + bodyPartLabel(res.bodyPart) : '' }}
                        </span>
                        <span>D20: {{ res.roll.d20 }}</span>
                        @if (res.roll.modifiersTotal) {
                            <span>Modificadores: {{ res.roll.modifiersTotal >= 0 ? '+' : '' }}{{ res.roll.modifiersTotal }}</span>
                        }
                        <span>Resultado: {{ res.roll.result }}</span>
                        @if (res.outcome === 'miss') {
                            <span>Necessário: {{ res.roll.required }}</span>
                            <span class="opacity-80">Nenhum dano causado.</span>
                        } @else {
                            @if (res.damage) {
                                <span>Dano: {{ res.damage }}</span>
                            }
                            @for (effect of res.effects; track effect) {
                                <span>Efeito: {{ effect }}</span>
                            }
                            <span>Custo: {{ res.cost.actions }} Ação(ões)</span>
                            @if (res.remainingResources) {
                                <span class="opacity-60">Restante: {{ res.remainingResources.actions }} Ação(ões), {{ res.remainingResources.movement }} Movimento(s)</span>
                            }
                        }
                    } @else {
                        <span class="text-red-400 font-black">ERRO</span>
                        <span>{{ res.error }}</span>
                    }
                </div>
            }
        </div>
    }
    `,
    styles: `
    .field {
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus { outline: 2px solid white; }
    `,
})
export class CombatCalculatorDialogComponent implements OnDestroy {
    protected readonly ui = inject(CombatCalculatorUiService);
    private readonly calculator = inject(CombatCalculatorService);
    private readonly playersService = inject(PlayersService);
    private readonly itemsService = inject(ItemsService);
    private readonly armaSelecionada = inject(ArmaSelecionadaUsuarioService);

    protected readonly actions = COMBAT_ACTIONS;
    protected readonly bodyParts = BODY_PARTS;
    protected readonly specialStats = SPECIAL_STATS;

    protected readonly action = signal<CombatAction>('shoot');
    protected readonly d20 = signal(10);
    protected readonly special = signal<Special>(createDefaultSpecial());
    protected readonly bodyPart = signal<BodyPart>('body');
    protected readonly baseDamage = signal(10);
    protected readonly distance = signal<number | null>(null);
    protected readonly weaponRange = signal<number | null>(null);
    protected readonly attackType = signal('');
    protected readonly itemLabel = signal('');
    protected readonly difficulty = signal<number | null>(null);

    protected readonly modifiers = signal<CombatModifier[]>([]);
    protected readonly modifierLabel = signal('');
    protected readonly modifierValue = signal(0);

    protected readonly result = signal<CombatCalculationResult | null>(null);

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    constructor() {
        document.body.appendChild(this.host);
    }

    ngOnDestroy(): void {
        this.host.remove();
    }

    protected setAction(value: string): void {
        this.action.set(value as CombatAction);
        this.result.set(null);
    }

    protected updateSpecial(stat: SpecialStat, value: number): void {
        this.special.update(current => ({ ...current, [stat]: value }));
    }

    /** Preenche o SPECIAL com o do jogador selecionado na SESSÃO, se houver. */
    protected prefillSpecial(): void {
        const player = this.playersService.selected();
        if (player) this.special.set(player.special);
    }

    /** Preenche dano base e alcance com a arma equipada de verdade pelo jogador selecionado na SESSÃO. */
    protected prefillWeapon(): void {
        const player = this.playersService.selected();
        if (!player) return;
        const itemId = this.armaSelecionada.armaDoUsuario(player.id);
        const weapon = itemId ? this.itemsService.find(itemId) : null;
        if (!weapon) return;
        if (weapon.damage !== undefined) this.baseDamage.set(weapon.damage);
        if (weapon.range !== undefined) this.weaponRange.set(weapon.range);
    }

    protected addModifier(): void {
        const label = this.modifierLabel().trim() || 'Modificador';
        this.modifiers.update(list => [...list, { label, value: this.modifierValue() }]);
        this.modifierLabel.set('');
        this.modifierValue.set(0);
    }

    protected removeModifier(index: number): void {
        this.modifiers.update(list => list.filter((_, i) => i !== index));
    }

    protected calculate(): void {
        const base = { d20: this.d20(), special: this.special(), modifiers: this.modifiers(), perks: [] };
        switch (this.action()) {
            case 'shoot':
                this.result.set(this.calculator.shoot({
                    ...base,
                    bodyPart: this.bodyPart(),
                    baseDamage: this.baseDamage(),
                    distance: this.distance() ?? undefined,
                    weaponRange: this.weaponRange() ?? undefined,
                }));
                break;
            case 'hit':
                this.result.set(this.calculator.hit({ ...base, baseDamage: this.baseDamage(), attackType: this.attackType() || undefined }));
                break;
            case 'heavy_attack':
                this.result.set(this.calculator.heavyAttack({ ...base, baseDamage: this.baseDamage(), attackType: this.attackType() || undefined }));
                break;
            case 'aim':
                this.result.set(this.calculator.aim(base));
                break;
            case 'reload':
                this.result.set(this.calculator.reload(base));
                break;
            case 'use_item':
                this.result.set(this.calculator.useItem({ ...base, itemLabel: this.itemLabel() || undefined }));
                break;
            case 'inspect':
                this.result.set(this.calculator.inspect({ ...base, difficulty: this.difficulty() ?? undefined }));
                break;
            case 'interact':
                this.result.set(this.calculator.interact(base));
                break;
            case 'stealth':
                this.result.set(this.calculator.stealth({ ...base, difficulty: this.difficulty() ?? undefined }));
                break;
        }
    }

    protected bodyPartLabel(part: BodyPart | undefined): string {
        return this.bodyParts.find(p => p.value === part)?.label ?? '';
    }

    protected number(event: Event): number {
        const raw = Number((event.target as HTMLInputElement).value);
        return Number.isFinite(raw) ? raw : 0;
    }
}
