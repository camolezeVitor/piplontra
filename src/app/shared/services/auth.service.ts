import { Injectable, computed, inject, signal } from "@angular/core";
import { Credentials } from "@shared/models/user";
import { RealtimeService } from "@shared/services/realtime.service";

const STORAGE_KEY = 'piplontra:session';

/**
 * Login irrisório: usuário e senha vão no handshake do socket e ficam salvos
 * em texto puro no localStorage pra reconectar sozinho (decisão consciente —
 * ver docs/spec-backend.md). Não existe token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly rt = inject(RealtimeService);

    readonly me = this.rt.me.asReadonly();
    readonly isLoggedIn = computed(() => this.me() !== null);
    /** Reconectando com a sessão salva ao abrir a página. */
    readonly connecting = signal(false);
    readonly error = signal<string | null>(null);

    constructor() {
        const saved = this.readSession();
        if (saved) this.enter(saved).catch(() => { /* sessão inválida: fica na tela de login */ });
    }

    login(username: string, password: string): Promise<void> {
        return this.enter({ username, password });
    }

    register(username: string, password: string, nickname = ''): Promise<void> {
        return this.enter({ username, password, nickname, register: true });
    }

    logout(): void {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* sem permissão */ }
        this.rt.disconnect();
    }

    /** Usado quando o próprio usuário troca a senha — a reconexão automática precisa da nova. */
    rememberPassword(password: string): void {
        const saved = this.readSession();
        if (saved) this.saveSession({ ...saved, password });
    }

    private async enter(credentials: Credentials): Promise<void> {
        this.connecting.set(true);
        this.error.set(null);
        try {
            await this.rt.connect(credentials);
            this.saveSession({ username: credentials.username, password: credentials.password });
        } catch (e) {
            this.error.set((e as Error).message);
            if ((e as Error).message === 'LOGIN INVÁLIDO') this.logout();
            throw e;
        } finally {
            this.connecting.set(false);
        }
    }

    private readSession(): Credentials | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    private saveSession(credentials: Credentials): void {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials)); } catch { /* sem permissão */ }
    }
}
