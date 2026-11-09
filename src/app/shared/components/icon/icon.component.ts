import { Component, input, numberAttribute } from "@angular/core";
import { NgxiPixelarticons, pixelarticonsDice } from "@ngxi/pixelarticons";

/** Qualquer ícone do pacote `@ngxi/pixelarticons` (todos têm o mesmo formato). */
export type PixelIcon = typeof pixelarticonsDice;

/**
 * Ícone pixel art (Pixelarticons). Pinta com `currentColor`, então herda a cor
 * do texto — inclusive o filtro de cor do Pip-Boy.
 */
@Component({
    selector: 'pip-icon',
    template: `<svg [ngxiPixelarticons]="icon()" [style.width.px]="size()" [style.height.px]="size()" style="image-rendering: pixelated" aria-hidden="true"></svg>`,
    host: { class: 'inline-flex shrink-0' },
    imports: [NgxiPixelarticons],
})
export class IconComponent {
    readonly icon = input.required<PixelIcon>();
    /** Lado em px — múltiplos de 12/24 ficam com os pixels nítidos. */
    readonly size = input(24, { transform: numberAttribute });
}
