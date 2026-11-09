import { Injectable, computed, inject, signal } from "@angular/core";
import { AuthService } from "@shared/services/auth.service";
import { RealtimeService } from "@shared/services/realtime.service";

/** Perfil do usuário logado — espelho do servidor (`me:update`). */
@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly rt = inject(RealtimeService);
    private readonly auth = inject(AuthService);

    readonly nickname = computed(() => this.rt.me()?.nickname ?? '');
    readonly username = computed(() => this.rt.me()?.username ?? '');
    readonly avatar = computed(() => this.rt.me()?.avatar ?? null);

    /** Cor sendo arrastada no seletor — aplica na hora localmente, vai pro servidor com debounce. */
    private readonly draftColor = signal<string | null>(null);
    private colorTimer: ReturnType<typeof setTimeout> | null = null;

    /** Cor que substitui o branco do app. */
    readonly color = computed(() => this.draftColor() ?? this.rt.me()?.color ?? '#ffffff');

    /** Valores 0..1 de cada canal, usados pelo feColorMatrix. */
    readonly rgb = computed(() => {
        const hex = this.color().replace('#', '');
        return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
    });

    setNickname(nickname: string): void {
        this.rt.send('me:update', { nickname });
    }

    setPassword(password: string): void {
        if (!password) return;
        this.rt.command('me:update', { password })
            .then(() => this.auth.rememberPassword(password))
            .catch(() => { /* já está em rt.error */ });
    }

    setAvatar(avatar: string | null): void {
        this.rt.send('me:update', { avatar });
    }

    setColor(color: string): void {
        this.draftColor.set(color);
        if (this.colorTimer) clearTimeout(this.colorTimer);
        this.colorTimer = setTimeout(() => {
            this.rt.command('me:update', { color })
                .catch(() => { /* já está em rt.error */ })
                .finally(() => { if (this.draftColor() === color) this.draftColor.set(null); });
        }, 300);
    }
}
