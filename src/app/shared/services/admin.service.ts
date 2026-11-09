import { Injectable, computed, inject } from "@angular/core";
import { RealtimeService } from "@shared/services/realtime.service";

/**
 * Indica se o usuário atual é o Mestre — vem do servidor (`MASTER_USERNAMES`
 * no `.env` do backend), não dá mais pra virar mestre por um checkbox. O Mestre
 * não é um jogador, mas pode cadastrar/editar quests, itens e o mapa, e
 * gerenciar o inventário de cada jogador.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly rt = inject(RealtimeService);

    readonly isAdmin = computed(() => this.rt.me()?.isMaster ?? false);
}
