import { Component, ElementRef, inject, signal, viewChild } from "@angular/core";
import { CardComponent } from "@shared/components/card/card.component";
import { OutlineDirective } from "@shared/directives/outline/outline.directive";
import { TitleDirective } from "@shared/directives/text/title.directive";
import { AuthService } from "@shared/services/auth.service";

/** Entrar / criar conta. Sem segurança de propósito — é só pra mesa saber quem é quem. */
@Component({
    selector: 'pip-login',
    template: `
    <form pipOutline class="flex flex-col gap-4 p-6 w-[320px]" (submit)="$event.preventDefault(); submit()">
        <p pipTitle>{{ mode() === 'login' ? 'ENTRAR' : 'CRIAR CONTA' }}</p>

        <label class="flex flex-col gap-1">
            <span class="text-xs opacity-80">&#64;USUÁRIO</span>
            <input #username class="field" type="text" autocomplete="username" required />
        </label>

        @if (mode() === 'register') {
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-80">APELIDO (nome do personagem)</span>
                <input #nickname class="field" type="text" autocomplete="nickname" />
            </label>
        }

        <label class="flex flex-col gap-1">
            <span class="text-xs opacity-80">SENHA</span>
            <input #password class="field" type="password" [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'" required />
        </label>

        @if (auth.error(); as error) {
            <p class="text-xs text-red-400">{{ error }}</p>
        }

        <button type="submit" class="hidden"></button>
        <pip-card
            class="bg-white! outline-white text-black/50! cursor-pointer select-none justify-center hover:bg-white/80! hover:outline-2 hover:outline-offset-2"
            (click)="submit()"
        >{{ auth.connecting() ? 'CONECTANDO...' : mode() === 'login' ? 'ENTRAR' : 'CRIAR CONTA' }}</pip-card>

        <button type="button" class="text-xs opacity-80 underline cursor-pointer" (click)="toggleMode()">
            {{ mode() === 'login' ? 'Primeira vez? Criar conta' : 'Já tenho conta' }}
        </button>
    </form>
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
    imports: [OutlineDirective, TitleDirective, CardComponent],
})
export class LoginComponent {
    protected readonly auth = inject(AuthService);
    protected readonly mode = signal<'login' | 'register'>('login');

    private readonly username = viewChild.required<ElementRef<HTMLInputElement>>('username');
    private readonly password = viewChild.required<ElementRef<HTMLInputElement>>('password');
    private readonly nickname = viewChild<ElementRef<HTMLInputElement>>('nickname');

    protected toggleMode(): void {
        this.mode.update(mode => mode === 'login' ? 'register' : 'login');
        this.auth.error.set(null);
    }

    protected submit(): void {
        if (this.auth.connecting()) return;
        const username = this.username().nativeElement.value;
        const password = this.password().nativeElement.value;
        const action = this.mode() === 'login'
            ? this.auth.login(username, password)
            : this.auth.register(username, password, this.nickname()?.nativeElement.value ?? '');
        action.catch(() => { /* a mensagem já está em auth.error */ });
    }
}
