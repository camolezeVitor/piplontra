import { Special } from "@shared/models/special";

/** Região do corpo alvejada numa ação de Atirar. */
export type BodyPart = 'head' | 'body' | 'leg' | 'arm';

export const BODY_PARTS: { value: BodyPart; label: string }[] = [
    { value: 'head', label: 'CABEÇA' },
    { value: 'body', label: 'CORPO' },
    { value: 'leg', label: 'PERNA' },
    { value: 'arm', label: 'BRAÇO' },
];

/** Ações suportadas pela calculadora — ver micro-spec. */
export type CombatAction =
    | 'shoot' | 'hit' | 'heavy_attack' | 'aim' | 'reload'
    | 'use_item' | 'inspect' | 'interact' | 'stealth';

export const COMBAT_ACTIONS: { value: CombatAction; label: string }[] = [
    { value: 'shoot', label: 'ATIRAR' },
    { value: 'hit', label: 'BATER' },
    { value: 'heavy_attack', label: 'ATAQUE PESADO' },
    { value: 'aim', label: 'MIRAR' },
    { value: 'reload', label: 'RECARREGAR' },
    { value: 'use_item', label: 'USAR ITEM' },
    { value: 'inspect', label: 'INSPECIONAR' },
    { value: 'interact', label: 'INTERAGIR' },
    { value: 'stealth', label: 'FURTIVIDADE' },
];

/** Um modificador nomeado (perk, cobertura, distância...) que soma ao D20 pra formar o "Resultado". */
export interface CombatModifier {
    label: string;
    value: number;
}

/** Quantos recursos de turno (ver tabela de AGI) uma ação consome. */
export interface CombatActionCost {
    actions: number;
    movement?: number;
}

/** Recursos de turno disponíveis ANTES da ação — opcional; se informado, o resultado traz o que resta depois. */
export interface CombatResourceState {
    actions: number;
    movement: number;
}

/** Contexto repassado aos hooks de perk — cada hook lê o que precisa daqui pra decidir se/como age. */
export interface CombatContext {
    action: CombatAction;
    special: Special;
    d20: number;
    bodyPart?: BodyPart;
    attackType?: string;
    [key: string]: unknown;
}

export interface MovementTableEntry {
    movement: number;
    actions: number;
}

/**
 * Pontos de extensão que um perk pode usar pra alterar o resultado SEM o
 * motor de combate precisar conhecer o perk especificamente (ver micro-spec,
 * seção "Perks"). Cada hook recebe o valor já calculado pelas regras base e
 * devolve o valor ajustado — se um hook não se aplicar àquele contexto
 * (ex.: só reage a `ctx.bodyPart === 'head'`), ele simplesmente devolve o
 * valor recebido sem alteração.
 */
export interface PerkHooks {
    /** Bloqueia a ação (retorna o motivo) se algum requisito do perk não for cumprido. */
    checkRequirement?(ctx: CombatContext): string | null;
    /** Ajusta a dificuldade (o "Necessário") antes da resolução do D20. */
    modifyDifficulty?(difficulty: number, ctx: CombatContext): number;
    /** Ajusta a soma de modificadores aplicada ao D20 (Resultado = D20 + modificadores). */
    modifyRollModifier?(modifier: number, ctx: CombatContext): number;
    /** Ajusta o multiplicador de região/crítico antes de aplicar ao dano base. */
    modifyMultiplier?(multiplier: number, ctx: CombatContext): number;
    /** Ajusta o dano final já multiplicado. */
    modifyDamage?(damage: number, ctx: CombatContext): number;
    /** Ajusta quantas Ações (e opcionalmente Movimento) uma ação custa. */
    modifyActionCost?(cost: number, ctx: CombatContext): number;
    /** Ajusta a tabela de Movimento/Ações derivada de AGI. */
    modifyMovementTable?(entry: MovementTableEntry, agi: number): MovementTableEntry;
    /** Ajusta a lista de efeitos de um acerto (ex.: efeito extra num crítico). */
    modifyEffects?(effects: string[], ctx: CombatContext, isCriticalSuccess: boolean): string[];
}

export interface Perk {
    id: string;
    label: string;
    hooks: PerkHooks;
}

export interface CombatRollInfo {
    d20: number;
    modifiers: CombatModifier[];
    modifiersTotal: number;
    /** D20 + modifiersTotal. */
    result: number;
    /** Dificuldade final (já considerando SPECIAL e perks) que o Resultado precisa alcançar. */
    required: number;
    isCriticalSuccess: boolean;
    isCriticalFailure: boolean;
}

export type CombatOutcome = 'hit' | 'miss';

export interface CombatResult {
    ok: true;
    action: CombatAction;
    outcome: CombatOutcome;
    roll: CombatRollInfo;
    damage: number;
    multiplier: number;
    bodyPart?: BodyPart;
    effects: string[];
    cost: CombatActionCost;
    remainingResources?: CombatResourceState;
    /** Labels dos perks que participaram dessa resolução (traço de auditoria pra UI/debug). */
    appliedPerks: string[];
}

export interface CombatError {
    ok: false;
    error: string;
}

export type CombatCalculationResult = CombatResult | CombatError;

export interface BaseActionInput {
    d20: number;
    special: Special;
    modifiers?: CombatModifier[];
    perks?: Perk[];
    resources?: CombatResourceState;
}

export interface ShootInput extends BaseActionInput {
    bodyPart: BodyPart;
    baseDamage: number;
    /** Distância até o alvo e alcance da arma, em tiles — se a distância passar do alcance, aplica penalidade automática no Resultado. */
    distance?: number;
    weaponRange?: number;
}

export interface HitInput extends BaseActionInput {
    /** Texto livre (ex.: "cortante", "concussivo") — perks podem reagir a isso via `ctx.attackType`. */
    attackType?: string;
    baseDamage: number;
}

export type HeavyAttackInput = HitInput;

export type AimInput = BaseActionInput;
export type ReloadInput = BaseActionInput;

export interface UseItemInput extends BaseActionInput {
    itemLabel?: string;
}

export interface InspectInput extends BaseActionInput {
    difficulty?: number;
}

export type InteractInput = BaseActionInput;

export interface StealthInput extends BaseActionInput {
    difficulty?: number;
}
