import { Component, ElementRef, HostListener, OnDestroy, computed, inject, input, model } from "@angular/core";

/**
 * Modal centralizado com backdrop. O host é movido para o <body> para escapar de
 * ancestrais com `filter`/`transform` (que quebram `position: fixed`) e para não
 * ser afetado pelo filtro de cor do app.
 */
@Component({
    selector: 'pip-modal',
    template: `
    @if (open()) {
        <div class="fixed inset-0 z-100 flex items-center justify-center bg-black/70" (click)="close()">
            <section
                role="dialog"
                aria-modal="true"
                [attr.aria-label]="title()"
                [class]="widthClass() + ' max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] bg-black text-white border border-white flex flex-col'"
                (click)="$event.stopPropagation()"
            >
                <header class="flex flex-row items-center justify-between px-4 py-2 border-b border-white">
                    <span class="font-black">{{ title() }}</span>
                    <button type="button" class="cursor-pointer px-2 hover:bg-white hover:text-black" aria-label="Fechar" (click)="close()">X</button>
                </header>
                <div class="p-4 overflow-auto">
                    <ng-content />
                </div>
            </section>
        </div>
    }
    `,
})
export class ModalComponent implements OnDestroy {
    readonly open = model(false);
    readonly title = input('');
    /** `lg` dá mais espaço horizontal pra conteúdo denso, como tabelas de admin. */
    readonly size = input<'sm' | 'lg'>('sm');
    protected readonly widthClass = computed(() => this.size() === 'lg' ? 'w-220' : 'w-105');

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    constructor() {
        document.body.appendChild(this.host);
    }

    @HostListener('document:keydown.escape')
    protected onEscape() {
        if (this.open()) this.close();
    }

    close() {
        this.open.set(false);
    }

    ngOnDestroy() {
        this.host.remove();
    }
}
