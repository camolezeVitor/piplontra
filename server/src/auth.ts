/** Login irrisório: usuário + senha em texto puro, enviados no handshake do socket. */
import { randomUUID } from 'crypto';
import { State, User } from './models';

export interface Credentials {
    username?: string;
    password?: string;
    nickname?: string;
    /** true = criar conta; ausente/false = login. */
    register?: boolean;
}

export function authenticate(s: State, creds: Credentials | undefined, masters: string[]): { user: User; created: boolean } {
    const username = String(creds?.username ?? '').trim().toLowerCase();
    const password = String(creds?.password ?? '');

    if (!creds?.register) {
        const user = s.users.find(u => u.username === username);
        if (!user || user.password !== password) throw new Error('LOGIN INVÁLIDO');
        return { user, created: false };
    }

    if (!username) throw new Error('USUÁRIO OBRIGATÓRIO');
    if (!password) throw new Error('SENHA OBRIGATÓRIA');
    if (s.users.some(u => u.username === username)) throw new Error('USUÁRIO JÁ EXISTE');

    const nickname = String(creds.nickname ?? '').trim() || username;
    const user: User = {
        id: randomUUID(), username, password, nickname, avatar: null, color: '#ffffff',
        isMaster: masters.includes(username),
    };
    s.users.push(user);
    // Sem personagem: o jogador escolhe um livre (players:claim) ou cria o seu (players:createOwn) depois de entrar.
    return { user, created: true };
}
