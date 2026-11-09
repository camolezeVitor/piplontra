import { Injectable } from "@angular/core";

/**
 * Explosão de partículas vermelhas (sangue) numa posição da tela — usado ao
 * dar dano num inimigo (mapa) ou num jogador (painel de sessão). Usa
 * `@tsparticles/confetti` (mesma família do `tsParticles` já usado pros
 * efeitos de tela do mapa) com cores/forma de sangue em vez de confete.
 * Import dinâmico: só baixa a lib no primeiro dano aplicado na sessão.
 */
@Injectable({ providedIn: 'root' })
export class BloodEffectService {
    async burst(clientX: number, clientY: number): Promise<void> {
        const { confetti } = await import('@tsparticles/confetti');

        const xRatio = clientX / window.innerWidth;
        const yRatio = clientY / window.innerHeight;

        const container = await confetti({
            particleCount: 40,
            count: 40,
            spread: 60,
            angle: 90,
            startVelocity: 20,
            gravity: 1.1,
            decay: 0.9,
            ticks: 100,
            scalar: 0.6,
            shapes: ['circle'],
            colors: ['#7a0c0c', '#a30d0d', '#c81e1e', '#8b0000'],
            origin: { x: xRatio, y: yRatio },
            position: { x: xRatio * 100, y: yRatio * 100 },
            zIndex: 9999,
            disableForReducedMotion: false,
        });

        // Garante que o canvas criado pelo confetti some depois — não depende
        // de limpeza automática da lib, que não é documentada com clareza.
        setTimeout(() => container?.destroy(), 3000);
    }
}
