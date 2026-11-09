import { authenticate } from './auth';
import { toPublic } from './models';
import { makeState, userA } from './testing/fixtures';

const MASTERS = ['mestre', 'vitor'];

describe('auth', () => {
    it('register cria usuário com username em lowercase e sem espaços', () => {
        const s = makeState();
        const { user, created } = authenticate(s, { username: '  Carlos ', password: 'x', register: true }, MASTERS);
        expect(created).toBe(true);
        expect(user).toMatchObject({ username: 'carlos', password: 'x', isMaster: false });
        expect(s.users).toContain(user);
    });

    it('register NÃO cria personagem — o jogador escolhe (ou cria) depois de entrar', () => {
        const s = makeState();
        const before = s.players.length;
        const { user } = authenticate(s, { username: 'carlos', password: 'x', nickname: 'Carlão', register: true }, MASTERS);
        expect(s.players).toHaveLength(before);
        expect(user.nickname).toBe('Carlão');
    });

    it('register sem nickname usa o username como apelido', () => {
        const { user } = authenticate(makeState(), { username: 'carlos', password: 'x', register: true }, MASTERS);
        expect(user.nickname).toBe('carlos');
    });

    it('register de username em MASTER_USERNAMES cria mestre', () => {
        const { user } = authenticate(makeState(), { username: 'Vitor', password: 'x', register: true }, MASTERS);
        expect(user.isMaster).toBe(true);
    });

    it('register com username vazio lança USUÁRIO OBRIGATÓRIO', () => {
        expect(() => authenticate(makeState(), { username: '  ', password: 'x', register: true }, MASTERS)).toThrow('USUÁRIO OBRIGATÓRIO');
    });

    it('register com senha vazia lança SENHA OBRIGATÓRIA', () => {
        expect(() => authenticate(makeState(), { username: 'carlos', password: '', register: true }, MASTERS)).toThrow('SENHA OBRIGATÓRIA');
    });

    it('register de username existente lança USUÁRIO JÁ EXISTE', () => {
        expect(() => authenticate(makeState(), { username: 'ANA', password: 'x', register: true }, MASTERS)).toThrow('USUÁRIO JÁ EXISTE');
    });

    it('login com senha certa retorna o usuário e created=false', () => {
        const s = makeState();
        const { user, created } = authenticate(s, { username: 'Ana', password: '1' }, MASTERS);
        expect(created).toBe(false);
        expect(user).toBe(s.users.find(u => u.id === 'u-a'));
    });

    it('login com senha errada lança LOGIN INVÁLIDO', () => {
        expect(() => authenticate(makeState(), { username: 'ana', password: 'errada' }, MASTERS)).toThrow('LOGIN INVÁLIDO');
    });

    it('login de usuário inexistente lança LOGIN INVÁLIDO', () => {
        expect(() => authenticate(makeState(), { username: 'zé', password: '1' }, MASTERS)).toThrow('LOGIN INVÁLIDO');
    });

    it('sem credenciais lança LOGIN INVÁLIDO', () => {
        expect(() => authenticate(makeState(), undefined, MASTERS)).toThrow('LOGIN INVÁLIDO');
    });

    it('toPublic remove password', () => {
        expect(toPublic(userA())).not.toHaveProperty('password');
    });
});
