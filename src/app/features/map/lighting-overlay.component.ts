import { Component, computed, inject } from "@angular/core";
import { MapObject } from "@shared/models/game-map";
import { AdminService } from "@shared/services/admin.service";
import { MapService } from "@shared/services/map.service";

const TILE = 16;

// Área coberta pela escuridão/luzes. O grid é "infinito" de verdade, mas a
// escuridão precisa de um tamanho fixo — esta caixa cobre bem além da imagem
// de exemplo (1024x1024) em qualquer direção, mas sem exagerar (quanto maior,
// mais pixels o navegador precisa rasterizar pra máscara a cada redesenho).
const BOUNDS_LEFT = -384;
const BOUNDS_TOP = -384;
const BOUNDS_SIZE = 1536;

interface LightShape {
    id: string;
    gradientId: string;
    cx: number;
    cy: number;
    r: number;
    /** Definido só pra lanternas (cone); ponto usa o círculo inteiro. */
    path?: string;
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/** Fatia de pizza (SVG path) centrada em (cx,cy), apontando `angleDeg`, com abertura `spreadDeg`. */
function conePath(cx: number, cy: number, r: number, angleDeg: number, spreadDeg: number): string {
    const start = toRad(angleDeg - spreadDeg / 2);
    const end = toRad(angleDeg + spreadDeg / 2);
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = spreadDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/** true se os dois arrays de luzes são "iguais" pros fins do SVG (mesma posição/forma). */
function lightsEqual(a: LightShape[], b: LightShape[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const x = a[i];
        const y = b[i];
        if (x.id !== y.id || x.cx !== y.cx || x.cy !== y.cy || x.r !== y.r || x.path !== y.path) return false;
    }
    return true;
}

/**
 * Escurece o mapa conforme `MapService.ambientLight` e recorta áreas
 * iluminadas por objetos do tipo "iluminação" (ponto 360° ou lanterna/cone).
 * Fica dentro do mundo (mesmo espaço de coordenadas dos objetos, dentro do
 * `pip-pan-zoom-viewport`) — a mesma `transform: scale()`/`translate()` que já
 * escala a imagem de fundo e os objetos escala este SVG também, então ele
 * nunca desalinha do resto do conteúdo em nenhum zoom/pan.
 *
 * Usa `<mask>` do SVG em vez de CSS `mask-image`/`box-shadow` (luzes
 * sobrepostas tendem a "somar" melhor). NÃO usa `mix-blend-mode` — é caro de
 * compositar e derrubava o FPS (principalmente arrastando objetos, que força
 * o navegador a repintar a máscara inteira) — então luzes bem sobrepostas têm
 * uma costura levemente imperfeita entre si, troca aceitável por performance.
 *
 * `lights` tem um comparador customizado: arrastar/editar um objeto que NÃO é
 * luz muda `MapService.objects()` (um único signal pra tudo), mas não deve
 * forçar esse SVG inteiro a re-renderizar — só quando a luz em si muda.
 *
 * Mestre sempre vê tudo, a menos que ligue "ver como jogador"
 * (`MapService.previewAsPlayer`) pra conferir o que os jogadores estão vendo.
 */
@Component({
    selector: 'pip-lighting-overlay',
    template: `
    @if (active()) {
        <svg
            class="absolute pointer-events-none"
            [style.left.px]="boundsLeft"
            [style.top.px]="boundsTop"
            [attr.width]="boundsSize"
            [attr.height]="boundsSize"
            [attr.viewBox]="viewBox"
        >
            <defs>
                @for (light of lights(); track light.id) {
                    <radialGradient
                        [attr.id]="light.gradientId"
                        gradientUnits="userSpaceOnUse"
                        [attr.cx]="light.cx"
                        [attr.cy]="light.cy"
                        [attr.r]="light.r"
                    >
                        <stop offset="0%" stop-color="black" />
                        <stop offset="70%" stop-color="black" />
                        <stop offset="100%" stop-color="white" />
                    </radialGradient>
                }
                <mask
                    id="pip-darkness-mask"
                    maskUnits="userSpaceOnUse"
                    [attr.x]="boundsLeft"
                    [attr.y]="boundsTop"
                    [attr.width]="boundsSize"
                    [attr.height]="boundsSize"
                >
                    <rect [attr.x]="boundsLeft" [attr.y]="boundsTop" [attr.width]="boundsSize" [attr.height]="boundsSize" fill="white" />
                    @for (light of lights(); track light.id) {
                        @if (light.path) {
                            <path [attr.d]="light.path" [attr.fill]="'url(#' + light.gradientId + ')'" />
                        } @else {
                            <circle [attr.cx]="light.cx" [attr.cy]="light.cy" [attr.r]="light.r" [attr.fill]="'url(#' + light.gradientId + ')'" />
                        }
                    }
                </mask>
            </defs>
            <rect
                [attr.x]="boundsLeft"
                [attr.y]="boundsTop"
                [attr.width]="boundsSize"
                [attr.height]="boundsSize"
                [attr.fill]="darknessColor()"
                mask="url(#pip-darkness-mask)"
            />
        </svg>
    }
    `,
    host: { class: 'contents' },
})
export class LightingOverlayComponent {
    private readonly map = inject(MapService);
    private readonly admin = inject(AdminService);

    protected readonly boundsLeft = BOUNDS_LEFT;
    protected readonly boundsTop = BOUNDS_TOP;
    protected readonly boundsSize = BOUNDS_SIZE;
    /** Reancora as coordenadas internas do SVG pra bater com as coordenadas de mundo. */
    protected readonly viewBox = `${BOUNDS_LEFT} ${BOUNDS_TOP} ${BOUNDS_SIZE} ${BOUNDS_SIZE}`;

    /** Jogadores sempre veem a iluminação real; o Mestre só quando pede pra conferir. */
    protected readonly active = computed(() => !this.admin.isAdmin() || this.map.previewAsPlayer());

    protected readonly darknessColor = computed(() => `rgba(0,0,0,${(100 - this.map.ambientLight()) / 100})`);

    protected readonly lights = computed<LightShape[]>(
        () => this.map.visibleObjects()
            .filter(o => o.type === 'illumination')
            .map(o => this.toShape(o)),
        { equal: lightsEqual },
    );

    private toShape(object: MapObject): LightShape {
        const cx = object.x * TILE + TILE / 2;
        const cy = object.y * TILE + TILE / 2;
        const r = Math.max(TILE, (object.lightRadius ?? 4) * TILE);
        const gradientId = `pip-light-grad-${object.id}`;

        if (object.lightKind === 'cone') {
            const path = conePath(cx, cy, r, object.lightAngle ?? 0, object.lightSpread ?? 60);
            return { id: object.id, gradientId, cx, cy, r, path };
        }
        return { id: object.id, gradientId, cx, cy, r };
    }
}
