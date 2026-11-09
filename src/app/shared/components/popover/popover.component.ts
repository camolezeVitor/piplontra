import { Component, ElementRef, HostListener, OnDestroy, effect, inject, input, model, signal } from "@angular/core";

/**
 * Painel flutuante ancorado a um elemento do pai. O host é movido pro <body>
 * (mesmo motivo do `ModalComponent`: escapar de ancestrais com `filter`/
 * `transform` — como o `filter: url(#pip-tint)` do app — que quebram
 * `position: fixed` em descendentes, e de ancestrais com `overflow` que
 * cortariam um popover `absolute` dentro de uma lista rolável).
 *
 * Diferente do Modal, o gatilho fica no componente pai (não há slot de
 * trigger aqui) e não escurece o fundo — é pra ações rápidas, não pra tomar
 * a tela toda:
 *
 *   <button #trigger (click)="open.set(true)">⚙</button>
 *   <pip-popover [(open)]="open" [anchor]="trigger">conteúdo</pip-popover>
 */
@Component({
    selector: 'pip-popover',
    template: `
    @if (open()) {
        <div class="fixed inset-0 z-100" (click)="close()"></div>
        <div
            data-panel
            class="fixed z-100 bg-black text-white border border-white p-3 w-max max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-auto"
            [style.left.px]="pos().left"
            [style.top.px]="pos().top"
            (click)="$event.stopPropagation()"
        >
            <ng-content />
        </div>
    }
    `,
})
export class PopoverComponent implements OnDestroy {
    readonly open = model(false);
    readonly anchor = input<Element | null>(null);

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    protected readonly pos = signal({ left: 0, top: 0 });
    private readonly updatePosition = () => this.computePosition();

    constructor() {
        document.body.appendChild(this.host);

        effect(() => {
            if (this.open()) {
                this.computePosition();
                document.addEventListener('scroll', this.updatePosition, { capture: true, passive: true });
                window.addEventListener('resize', this.updatePosition);
            } else {
                document.removeEventListener('scroll', this.updatePosition, true);
                window.removeEventListener('resize', this.updatePosition);
            }
        });
    }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        if (this.open()) this.close();
    }

    close(): void {
        this.open.set(false);
    }

    ngOnDestroy(): void {
        this.host.remove();
        document.removeEventListener('scroll', this.updatePosition, true);
        window.removeEventListener('resize', this.updatePosition);
    }

    private computePosition(): void {
        const anchorEl = this.anchor();
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        this.pos.set({ left: rect.left, top: rect.bottom + 4 });
        // o tamanho real do painel só existe depois do próximo ciclo de render — reajusta pra não vazar da viewport.
        queueMicrotask(() => this.clampToViewport());
    }

    private clampToViewport(): void {
        const panel = this.host.querySelector<HTMLElement>('[data-panel]');
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const left = Math.min(this.pos().left, window.innerWidth - rect.width - 8);
        const top = Math.min(this.pos().top, window.innerHeight - rect.height - 8);
        this.pos.set({ left: Math.max(8, left), top: Math.max(8, top) });
    }
}
