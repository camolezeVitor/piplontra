import { Injectable } from "@angular/core";
import {
    AimInput, BaseActionInput, BodyPart, CombatActionCost, CombatCalculationResult, CombatContext,
    CombatError, CombatModifier, CombatOutcome, CombatResourceState, CombatResult, CombatRollInfo,
    HeavyAttackInput, HitInput, InspectInput, InteractInput, MovementTableEntry, Perk, ReloadInput,
    ShootInput, StealthInput, UseItemInput,
} from "@shared/models/combat-calculator";
import { SPECIAL_STATS } from "@shared/models/special";

const NATURAL_CRITICAL = 20;
const NATURAL_FUMBLE = 1;
const CRITICAL_MULTIPLIER = 2;
/** Valor de referência de um SPECIAL "neutro" (ver `createDefaultSpecial`) — cada ponto acima/abaixo ajusta a dificuldade em 1. */
const SPECIAL_BASELINE = 5;
const SQUARES_PER_MOVEMENT = 4;

const BODY_PART_DIFFICULTY: Record<BodyPart, number> = {
    head: 16,
    body: 10,
    leg: 13,
    arm: 13,
};

const BODY_PART_MULTIPLIER: Record<BodyPart, number> = {
    head: 1.2,
    body: 1,
    leg: 0.8,
    arm: 0.8,
};

const BODY_PART_EFFECT: Partial<Record<BodyPart, string>> = {
    leg: '-1 Movimento',
    arm: '-1 Ação',
};

const MELEE_BASE_DIFFICULTY = 10;

const MOVEMENT_TABLE: Record<number, MovementTableEntry> = {
    1: { movement: 1, actions: 1 },
    2: { movement: 1, actions: 2 },
    3: { movement: 2, actions: 1 },
    4: { movement: 2, actions: 1 },
    5: { movement: 2, actions: 1 },
    6: { movement: 2, actions: 2 },
    7: { movement: 2, actions: 2 },
    8: { movement: 3, actions: 2 },
    9: { movement: 3, actions: 2 },
    10: { movement: 3, actions: 3 },
};

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Motor de regras de combate SPECIAL + D20 — puro cálculo, sem estado e sem
 * conhecimento de mapa/personagem/inventário (ver micro-spec). Cada método
 * de ação recebe os parâmetros, valida, resolve o D20 contra uma dificuldade
 * derivada do SPECIAL relevante, e devolve um resultado estruturado.
 *
 * Perks entram como uma lista de hooks (`Perk.hooks`) aplicados em sequência
 * em cada etapa (dificuldade, modificador, multiplicador, dano, custo,
 * efeitos) — o núcleo nunca precisa conhecer um perk específico.
 */
@Injectable({ providedIn: 'root' })
export class CombatCalculatorService {
    shoot(input: ShootInput): CombatCalculationResult {
        const invalid = this.validate(input);
        if (invalid) return invalid;
        if (!Number.isFinite(input.baseDamage) || input.baseDamage < 0) {
            return { ok: false, error: 'DANO BASE INVÁLIDO.' };
        }

        const perks = input.perks ?? [];
        const ctx: CombatContext = { action: 'shoot', special: input.special, d20: input.d20, bodyPart: input.bodyPart };
        const requirementError = this.checkRequirements(perks, ctx);
        if (requirementError) return requirementError;

        const modifiers = [...(input.modifiers ?? [])];
        if (input.distance !== undefined && input.weaponRange !== undefined && input.distance > input.weaponRange) {
            modifiers.push({ label: 'Distância', value: -(input.distance - input.weaponRange) });
        }

        const difficulty = this.applyDifficultyPerks(perks, BODY_PART_DIFFICULTY[input.bodyPart], ctx);
        const roll = this.resolveRoll(input.d20, difficulty, input.special.perception, modifiers, perks, ctx);
        const cost = this.resolveActionCost(perks, 1, ctx);

        if (!this.isHit(roll)) {
            return this.buildResult('shoot', 'miss', roll, 0, 0, input.bodyPart, [], cost, input.resources, perks);
        }

        const multiplier = this.applyMultiplierPerks(perks, roll.isCriticalSuccess ? CRITICAL_MULTIPLIER : BODY_PART_MULTIPLIER[input.bodyPart], ctx);
        const damage = this.applyDamagePerks(perks, round1(input.baseDamage * multiplier), ctx);
        const baseEffects = BODY_PART_EFFECT[input.bodyPart] ? [BODY_PART_EFFECT[input.bodyPart]!] : [];
        const effects = this.applyEffectPerks(perks, baseEffects, ctx, roll.isCriticalSuccess);

        return this.buildResult('shoot', 'hit', roll, damage, multiplier, input.bodyPart, effects, cost, input.resources, perks);
    }

    hit(input: HitInput): CombatCalculationResult {
        return this.resolveMelee('hit', input, 0, 1, 1);
    }

    heavyAttack(input: HeavyAttackInput): CombatCalculationResult {
        return this.resolveMelee('heavy_attack', input, 1, 1.5, 2);
    }

    /** Sem dano — só concede um bônus (via `roll`/efeitos) pra uma próxima ação de Atirar, a critério de quem consome o resultado. */
    aim(input: AimInput): CombatCalculationResult {
        return this.resolveCheck('aim', input, input.special.perception, 10, 1, 'MIRA CONCEDIDA.', 'MIRA MAL SUCEDIDA.');
    }

    reload(input: ReloadInput): CombatCalculationResult {
        return this.resolveFreeAction('reload', input, 1, 'ARMA RECARREGADA.');
    }

    useItem(input: UseItemInput): CombatCalculationResult {
        return this.resolveFreeAction('use_item', input, 1, input.itemLabel ? `ITEM USADO: ${input.itemLabel}.` : 'ITEM USADO.');
    }

    inspect(input: InspectInput): CombatCalculationResult {
        return this.resolveCheck('inspect', input, input.special.perception, input.difficulty ?? 8, 0, 'DETALHE REVELADO.', 'NADA NOTADO.');
    }

    interact(input: InteractInput): CombatCalculationResult {
        return this.resolveFreeAction('interact', input, 1, 'INTERAÇÃO REALIZADA.');
    }

    stealth(input: StealthInput): CombatCalculationResult {
        return this.resolveCheck('stealth', input, input.special.agility, input.difficulty ?? 10, 1, 'NÃO DETECTADO.', 'DETECTADO.');
    }

    /** Tabela de Movimento/Ações derivada de AGI (1-10) — cada Movimento equivale a 4 quadrados. */
    getMovementAndActions(agi: number, perks: Perk[] = []): MovementTableEntry & { squares: number } {
        const clamped = Math.max(1, Math.min(10, Math.round(agi)));
        let entry = { ...MOVEMENT_TABLE[clamped] };
        for (const perk of perks) entry = perk.hooks.modifyMovementTable?.(entry, clamped) ?? entry;
        return { ...entry, squares: entry.movement * SQUARES_PER_MOVEMENT };
    }

    // --- corpo-a-corpo (Bater / Ataque Pesado compartilham a mesma resolução) ---

    private resolveMelee(
        action: 'hit' | 'heavy_attack',
        input: HitInput,
        difficultyDelta: number,
        baseMultiplier: number,
        baseCost: number,
    ): CombatCalculationResult {
        const invalid = this.validate(input);
        if (invalid) return invalid;
        if (!Number.isFinite(input.baseDamage) || input.baseDamage < 0) {
            return { ok: false, error: 'DANO BASE INVÁLIDO.' };
        }

        const perks = input.perks ?? [];
        const ctx: CombatContext = { action, special: input.special, d20: input.d20, attackType: input.attackType };
        const requirementError = this.checkRequirements(perks, ctx);
        if (requirementError) return requirementError;

        const difficulty = this.applyDifficultyPerks(perks, MELEE_BASE_DIFFICULTY + difficultyDelta, ctx);
        const roll = this.resolveRoll(input.d20, difficulty, input.special.strength, input.modifiers ?? [], perks, ctx);
        const cost = this.resolveActionCost(perks, baseCost, ctx);

        if (!this.isHit(roll)) {
            return this.buildResult(action, 'miss', roll, 0, 0, undefined, [], cost, input.resources, perks);
        }

        const multiplier = this.applyMultiplierPerks(perks, roll.isCriticalSuccess ? CRITICAL_MULTIPLIER : baseMultiplier, ctx);
        const damage = this.applyDamagePerks(perks, round1(input.baseDamage * multiplier), ctx);
        const effects = this.applyEffectPerks(perks, [], ctx, roll.isCriticalSuccess);

        return this.buildResult(action, 'hit', roll, damage, multiplier, undefined, effects, cost, input.resources, perks);
    }

    // --- checagens simples (sem dano): Mirar/Inspecionar/Furtividade ---

    private resolveCheck(
        action: CombatContext['action'],
        input: BaseActionInput,
        statValue: number,
        defaultDifficulty: number,
        cost: number,
        successEffect: string,
        failureEffect: string,
    ): CombatCalculationResult {
        const invalid = this.validate(input);
        if (invalid) return invalid;

        const perks = input.perks ?? [];
        const ctx: CombatContext = { action, special: input.special, d20: input.d20 };
        const requirementError = this.checkRequirements(perks, ctx);
        if (requirementError) return requirementError;

        const difficulty = this.applyDifficultyPerks(perks, defaultDifficulty, ctx);
        const roll = this.resolveRoll(input.d20, difficulty, statValue, input.modifiers ?? [], perks, ctx);
        const actionCost = this.resolveActionCost(perks, cost, ctx);
        const success = this.isHit(roll);
        const effects = this.applyEffectPerks(perks, [success ? successEffect : failureEffect], ctx, roll.isCriticalSuccess);

        return this.buildResult(action, success ? 'hit' : 'miss', roll, 0, 0, undefined, effects, actionCost, input.resources, perks);
    }

    // --- ações livres (sem rolagem): Recarregar/Usar Item/Interagir ---

    private resolveFreeAction(action: CombatContext['action'], input: BaseActionInput, cost: number, effect: string): CombatCalculationResult {
        const invalid = this.validate(input);
        if (invalid) return invalid;

        const perks = input.perks ?? [];
        const ctx: CombatContext = { action, special: input.special, d20: input.d20 };
        const requirementError = this.checkRequirements(perks, ctx);
        if (requirementError) return requirementError;

        const actionCost = this.resolveActionCost(perks, cost, ctx);
        const effects = this.applyEffectPerks(perks, [effect], ctx, false);
        const roll: CombatRollInfo = { d20: input.d20, modifiers: [], modifiersTotal: 0, result: input.d20, required: 0, isCriticalSuccess: false, isCriticalFailure: false };

        return this.buildResult(action, 'hit', roll, 0, 0, undefined, effects, actionCost, input.resources, perks);
    }

    // --- núcleo compartilhado ---

    private resolveRoll(
        d20: number,
        difficulty: number,
        statValue: number,
        modifiers: CombatModifier[],
        perks: Perk[],
        ctx: CombatContext,
    ): CombatRollInfo {
        const modifiersTotal = this.applyModifierPerks(perks, modifiers.reduce((sum, m) => sum + m.value, 0), ctx);
        const result = d20 + modifiersTotal;
        const required = Math.max(1, difficulty - (statValue - SPECIAL_BASELINE));
        return {
            d20,
            modifiers,
            modifiersTotal,
            result,
            required,
            isCriticalSuccess: d20 === NATURAL_CRITICAL,
            isCriticalFailure: d20 === NATURAL_FUMBLE,
        };
    }

    private isHit(roll: CombatRollInfo): boolean {
        if (roll.isCriticalFailure) return false;
        return roll.isCriticalSuccess || roll.result >= roll.required;
    }

    private resolveActionCost(perks: Perk[], base: number, ctx: CombatContext): CombatActionCost {
        let actions = base;
        for (const perk of perks) actions = perk.hooks.modifyActionCost?.(actions, ctx) ?? actions;
        return { actions };
    }

    private buildResult(
        action: CombatContext['action'],
        outcome: CombatOutcome,
        roll: CombatRollInfo,
        damage: number,
        multiplier: number,
        bodyPart: BodyPart | undefined,
        effects: string[],
        cost: CombatActionCost,
        resources: CombatResourceState | undefined,
        perks: Perk[],
    ): CombatResult {
        const remainingResources: CombatResourceState | undefined = resources ? {
            actions: Math.max(0, resources.actions - cost.actions),
            movement: Math.max(0, resources.movement - (cost.movement ?? 0)),
        } : undefined;

        return {
            ok: true,
            action,
            outcome,
            roll,
            damage,
            multiplier,
            bodyPart,
            effects,
            cost,
            remainingResources,
            appliedPerks: perks.map(perk => perk.label),
        };
    }

    private validate(input: BaseActionInput): CombatError | null {
        if (!Number.isInteger(input.d20) || input.d20 < 1 || input.d20 > 20) {
            return { ok: false, error: 'D20 DEVE SER UM NÚMERO INTEIRO ENTRE 1 E 20.' };
        }
        for (const stat of SPECIAL_STATS) {
            const value = input.special[stat.value];
            if (!Number.isFinite(value) || value < 1 || value > 10) {
                return { ok: false, error: `SPECIAL INVÁLIDO: ${stat.label} DEVE SER ENTRE 1 E 10.` };
            }
        }
        return null;
    }

    private checkRequirements(perks: Perk[], ctx: CombatContext): CombatError | null {
        for (const perk of perks) {
            const reason = perk.hooks.checkRequirement?.(ctx);
            if (reason) return { ok: false, error: reason };
        }
        return null;
    }

    private applyDifficultyPerks(perks: Perk[], value: number, ctx: CombatContext): number {
        let result = value;
        for (const perk of perks) result = perk.hooks.modifyDifficulty?.(result, ctx) ?? result;
        return result;
    }

    private applyModifierPerks(perks: Perk[], value: number, ctx: CombatContext): number {
        let result = value;
        for (const perk of perks) result = perk.hooks.modifyRollModifier?.(result, ctx) ?? result;
        return result;
    }

    private applyMultiplierPerks(perks: Perk[], value: number, ctx: CombatContext): number {
        let result = value;
        for (const perk of perks) result = perk.hooks.modifyMultiplier?.(result, ctx) ?? result;
        return result;
    }

    private applyDamagePerks(perks: Perk[], value: number, ctx: CombatContext): number {
        let result = value;
        for (const perk of perks) result = perk.hooks.modifyDamage?.(result, ctx) ?? result;
        return round1(result);
    }

    private applyEffectPerks(perks: Perk[], value: string[], ctx: CombatContext, isCriticalSuccess: boolean): string[] {
        let result = value;
        for (const perk of perks) result = perk.hooks.modifyEffects?.(result, ctx, isCriticalSuccess) ?? result;
        return result;
    }
}
