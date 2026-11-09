import { Component, inject } from "@angular/core";
import { UserService } from "../../services/user.service";

/**
 * Define o filtro SVG `#pip-tint`, que multiplica cada canal pela cor escolhida:
 * branco -> cor, preto continua preto. Aplique com `filter: url(#pip-tint)`.
 */
@Component({
    selector: 'pip-color-filter',
    template: `
    <svg width="0" height="0" class="absolute pointer-events-none" aria-hidden="true">
        <filter id="pip-tint" color-interpolation-filters="sRGB">
            <feColorMatrix
                type="matrix"
                [attr.values]="matrix()"
            />
        </filter>
    </svg>
    `,
})
export class ColorFilterComponent {
    private readonly user = inject(UserService);

    protected matrix() {
        const [r, g, b] = this.user.rgb();
        return `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
    }
}
