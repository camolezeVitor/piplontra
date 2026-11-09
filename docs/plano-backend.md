# Plano de implementação — Backend Piplontra (NestJS, TDD, KISS)

> Referência das **regras** de jogo: [spec-backend.md](spec-backend.md).
> Este plano define **como** construir e **simplifica a spec** em quatro pontos (§1).
> Regra de ouro: **nenhuma linha de produção sem um teste vermelho antes.**

---

## 1. Simplificações em relação à spec

| Spec | Plano (mais simples) | Ganho |
|---|---|---|
| Um `@SubscribeMessage` por comando (~50 handlers) | **Um evento só: `cmd`**, com `{ type, payload }`, despachado por uma **tabela** `COMMANDS` | O gateway tem ~40 linhas. A tabela é testável sem socket. |
| `POST /api/auth/register` e `/login` + token | **Login no handshake do socket**: `io({ auth: { username, password, register? } })` | Sem controller HTTP, sem token, sem supertest. Senha em texto puro, como pedido. |
| `POST /api/uploads` + `UploadsService` no front | **O servidor troca qualquer `data:image/...` de qualquer payload** por um arquivo em `uploads/` e grava a URL | O front continua usando `readAsDataUrl` como hoje. A migração do localStorage converte as imagens "de graça". |
| Comandos de player com `{ id }` | **Todo comando que mexe num player usa `payload.playerId`** | Uma checagem de dono só, genérica. |

Fica igual: estado em memória, `db.json` com debounce, broadcast da coleção inteira,
`MASTER_USERNAMES`, permissões M / D (dono ou mestre) / T, e o Nest servindo o build do Angular.

**Novidades do front desde a spec:**
- `Quest.playerIds`: a quest pode ser atribuída a jogadores (vazio = geral). Quando um player
  é removido, o id dele sai das quests.
- A calculadora de combate (`CombatCalculatorService`) é cálculo puro e não persiste nada,
  então **fica no cliente**.

---

## 2. Arquitetura (o projeto inteiro)

```
server/
├─ src/
│  ├─ models.ts          # tipos + constantes copiados do front (PERKS, RECIPES, WEAPON_AMMO_..., etc.)
│  ├─ seed.ts            # itens, quests e receitas padrão
│  ├─ rules.ts           # ★ funções puras que mutam o State (90% da lógica)
│  ├─ commands.ts        # ★ tabela COMMANDS + execute() (permissão + despacho)
│  ├─ auth.ts            # authenticate(state, credenciais) — puro
│  ├─ images.ts          # extractDataUrls(payload, dir) — troca data: URL por arquivo
│  ├─ db.ts              # Db: load / normalize / touch (debounce) / flush (atômico)
│  ├─ game.gateway.ts    # cola: handshake → authenticate, 'cmd' → execute → broadcast
│  ├─ app.module.ts
│  ├─ main.ts            # createApp() exportado (o e2e reusa)
│  └─ testing/fixtures.ts
├─ test/
│  ├─ game.e2e-spec.ts
│  └─ jest-e2e.json
└─ data/                 # gitignored: db.json, db.backup.json, uploads/
```

**Fluxo de um comando:**

```
cliente ──emit('cmd',{type,payload})──▶ gateway
  gateway: extractDataUrls(payload) → execute(state, user, type, payload)
  execute: COMMANDS[type] → checa perm → run(state, payload, user) → { sync, data?, fx? }
  gateway: db.touch(); para cada key em sync: io.emit(`sync:${key}`, state[key]); fx → io.emit
  ◀── ack { ok, data? } | { ok:false, error }
```

**Contratos centrais** (escreva primeiro; os testes dependem deles):

```ts
// commands.ts
export type Perm = 'master' | 'owner' | 'any';
export type SyncKey = 'items' | 'quests' | 'recipes' | 'players' | 'loot' | 'map' | 'users';
export interface CmdResult { sync: SyncKey[]; data?: unknown; fx?: { event: string; data: unknown } }
export interface Cmd { perm: Perm; run(state: State, payload: any, user: User): CmdResult }
export type Ack = { ok: true; data?: unknown } | { ok: false; error: string };

export const COMMANDS: Record<string, Cmd> = { /* §4 */ };
export function execute(state: State, user: User, type: string, payload: any): Ack & { result?: CmdResult };
```

```ts
// rules.ts — regra quebrada = throw new Error('MENSAGEM PRO JOGADOR')
// Regra de ouro: VALIDAR TUDO ANTES DE MUTAR. Erro nunca deixa o estado pela metade.
```

Sem módulos por entidade, DTOs, class-validator, ORM, JWT, bcrypt, Passport, controllers HTTP
ou repositories. O Nest entra só como casca: DI do `Db`, o gateway e o servidor estático.

---

## 3. Ferramentas e ciclo TDD

- Gerar com `npx @nestjs/cli new server --package-manager npm --skip-git`. Vem com **Jest +
  ts-jest** configurados (`npm test`, `npm run test:e2e`). Apagar o `AppController`/`AppService`
  de exemplo.
- Dependências extras: `@nestjs/websockets @nestjs/platform-socket.io socket.io @nestjs/serve-static`;
  dev: `socket.io-client`.
- Rodar `npm test -- --watch` o tempo todo.
- Ciclo: **🔴 escrever o teste da lista → ver falhar → 🟢 código mínimo → 🔵 refatorar com verde.**
- Pirâmide:
  - **unit puro** (`rules`, `commands`, `auth`, `images`, `db`): rápidos, sem Nest; são ~90% dos testes;
  - **um e2e** (`game.e2e-spec.ts`): Nest de verdade, porta aleatória, socket.io-client, `DATA_DIR` temporário.
- Nada de mocks de Nest. Os unit tests chamam funções; o e2e sobe a app inteira.

### 3.1 Fixtures (Fase 0, antes de qualquer teste)

```ts
// src/testing/fixtures.ts
export const master = (o: Partial<User> = {}): User => ({ id: 'u-master', username: 'mestre', password: '1', nickname: 'Mestre', avatar: null, color: '#fff', isMaster: true, ...o });
export const userA  = (o: Partial<User> = {}): User => ({ ...master(), id: 'u-a', username: 'ana', isMaster: false, ...o });
export const userB  = (o: Partial<User> = {}): User => ({ ...userA(), id: 'u-b', username: 'bia', ...o });

export const pistol  = (): Item => ({ id: 'i-pistol', category: 'weapon', label: '10mm Pistol', weight: 4, value: 50, ammoType: '10mm', damage: 18 });
export const knife   = (): Item => ({ id: 'i-knife', category: 'weapon', label: 'Knife', weight: 1, value: 10, ammoType: '' });
export const ammo10  = (): Item => ({ id: 'i-10mm', category: 'ammo', label: '10mm Round', weight: 0, value: 2 });
export const stimpak = (): Item => ({ id: 'i-stim', category: 'aid', label: 'Stimpak', weight: 0, value: 50, hp: 30, rads: 0 });
export const radaway = (): Item => ({ id: 'i-rad', category: 'aid', label: 'RadAway', weight: 0, value: 80, hp: 0, rads: -300 });
export const helmet  = (): Item => ({ id: 'i-helmet', category: 'apparel', label: 'Helmet', weight: 2, value: 30, apparelSlot: 'head', dr: 5 });
export const can     = (): Item => ({ id: 'i-can', category: 'junk', label: 'Aluminum Can', weight: 0.1, value: 5 });
export const fan     = (): Item => ({ id: 'i-fan', category: 'junk', label: 'Desk Fan', weight: 3, value: 15 });

export const player = (o: Partial<Player> = {}): Player => ({ ...createPlayer(), id: 'p-a', userId: 'u-a', equippedWeaponId: null, equippedApparel: {}, ...o });

/** Estado mínimo e previsível: 1 player da Ana, catálogo pequeno, 1 receita (2 latas + 1 ventilador → 20 balas 10mm). */
export function makeState(o: Partial<State> = {}): State {
  return {
    version: 1,
    users: [master(), userA(), userB()],
    items: [pistol(), knife(), ammo10(), stimpak(), radaway(), helmet(), can(), fan()],
    quests: [], loot: [],
    recipes: [{ id: 'r-ammo', label: 'AMMO', icon: '', inputs: [{ itemLabel: 'Aluminum Can', quantity: 2 }, { itemLabel: 'Desk Fan', quantity: 1 }], outputs: [{ itemLabel: '10mm Round', quantity: 20 }] }],
    players: [player()],
    map: createEmptyGameMap(),
    ...o,
  };
}
export const inv = (s: State, playerId = 'p-a') => Object.fromEntries(s.players.find(p => p.id === playerId)!.inventory.map(e => [e.itemId, e.quantity]));
```

---

## 4. Fases (cada fase = lista de testes a escrever ANTES do código)

> Convenção: `it('...')` é o nome exato do teste. Escreva **todos os `it` da fase com
> `it.todo`** primeiro (fica como checklist no Jest) e vá transformando um por vez em vermelho → verde.

### Fase 0 — Esqueleto (sem TDD, só infraestrutura)
1. `nest new server`; apagar o exemplo; `npm test` passando com zero testes.
2. `models.ts`: copiar os tipos/constantes do front + `State`, `User`, `PublicUser`. Mudanças no
   `Player`: `+userId`, `+equippedWeaponId`, `+equippedApparel`, `-isYou`.
3. `testing/fixtures.ts` (§3.1).
4. `server/.gitignore` com `data/`.

**Pronto quando:** `npm test` passa e o `tsc` compila.

---

### Fase 1 — `rules.ts` (o coração) · `rules.spec.ts`

**1.1 Utilitário de patch**
- `it('patchById mescla changes e nunca troca o id')`
- `it('patchById de item preserva category')`
- `it('patchById lança NÃO ENCONTRADO para id inexistente')`

**1.2 Inventário**
- `it('addToInventory soma na pilha existente')`
- `it('addToInventory cria pilha nova quando não existe')`
- `it('setItemQuantity com 0 ou negativo remove a pilha')`
- `it('removeFromInventory tira a pilha inteira')`

**1.3 Atributos ajustáveis pelo mestre**
- `it('damage reduz hp e nunca deixa negativo')`
- `it('damage com amount <= 0 não faz nada')`
- `it('spendAp reduz ap com piso 0')`
- `it('adjustRads aceita negativo e tem piso 0')`
- `it('adjustCoins aceita negativo e tem piso 0')`

**1.4 XP e progressão**
- `it('addXp abaixo do necessário só acumula')` — lvl 1, +50 → lvl 1, xp 50
- `it('addXp exato sobe 1 nível e dá 1 ponto de SPECIAL e 1 de perk')` — lvl 1, +100 → lvl 2, xp 0, pontos 1/1
- `it('addXp grande sobe vários níveis e guarda o resto')` — lvl 1, +350 → lvl 3, xp 50, pontos 2/2
- `it('allocateSpecial sem ponto lança SEM PONTOS DE SPECIAL')`
- `it('allocateSpecial gasta 1 ponto e soma 1 no atributo')`
- `it('choosePerk sem ponto lança SEM PONTOS DE PERK')`
- `it('choosePerk de perk inexistente lança PERK INEXISTENTE')`
- `it('choosePerk no rank máximo lança RANK MÁXIMO')`
- `it('choosePerk gasta 1 ponto e sobe o rank')`

**1.5 Equipar**
- `it('equipWeapon seta e null desequipa')`
- `it('equipApparel substitui o item do mesmo slot')`
- `it('equipApparel com null desequipa só aquele slot')`

**1.6 Usar / vender / craftar**
- `it('useAid de item que não é aid lança ITEM INVÁLIDO')`
- `it('useAid sem estoque lança SEM ESTOQUE')`
- `it('useAid cura sem passar do maxHp e consome 1')`
- `it('useAid de RadAway reduz rads com piso 0')`
- `it('useAid da última unidade remove a pilha')`
- `it('useWeapon sem arma equipada lança NENHUMA ARMA EQUIPADA')`
- `it('useWeapon de arma sem munição rastreada retorna fired e não gasta nada')` — knife
- `it('useWeapon com munição gasta 1 e retorna fired')`
- `it('useWeapon sem munição retorna no-ammo e não altera o estado')`
- `it('sell soma value × quantidade em coins e tira do estoque')`
- `it('sell acima do estoque lança SEM ESTOQUE e não altera nada')`
- `it('sell que zera a pilha da arma equipada desequipa')`
- `it('sell que zera a pilha da roupa equipada desequipa o slot')`
- `it('craft sem insumos lança FALTAM INSUMOS e o estado fica idêntico')` — `expect(s).toEqual(cópia)`
- `it('craft consome insumos e soma os produtos')`
- `it('craft de receita inexistente lança RECEITA INEXISTENTE')`

**1.7 Loot**
- `it('addLootBatch cria uma entrada por item com o source')`
- `it('claimLoot move para o inventário e remove o loot')`
- `it('claimLoot de loot inexistente lança JÁ PEGARAM')`

**1.8 Mapa**
- `it('moveObjects atualiza x/y de vários objetos')`
- `it('removeObjects remove todos os ids')`
- `it('damageEnemy reduz hp do inimigo')`
- `it('damageEnemy que zera o hp remove o objeto e joga o loot com source = label')`
- `it('damageEnemy sem label usa source Inimigo')`
- `it('damageEnemy em objeto que não é inimigo lança NÃO É INIMIGO')`
- `it('setAmbientLight limita a 0..100 e arredonda')`
- `it('toggleEffect liga e desliga')`

**1.9 Cascatas**
- `it('removeItem tira o item de inventários, loot, loot de inimigos e equipamentos')`
- `it('renameItem propaga o novo label nas receitas')` (acionado por `items:update` com `label`)
- `it('removePlayer tira o id das quests.playerIds')`

**Pronto quando:** todos verdes. As implementações são cópias quase literais do
`PlayersService`/`MapService` atuais, trocando `signal.update` por mutação direta e
`return` silencioso por `throw` quando a ação é inválida.

---

### Fase 2 — `commands.ts` · `commands.spec.ts`

A tabela liga `type → { perm, run }`. Cada `run` é uma ou duas linhas chamando `rules`.

```ts
'players:craft': { perm: 'owner', run: (s, p) => (rules.craft(s, p.playerId, p.recipeId), { sync: ['players'] }) },
```

**Testes:**
- `it('comando desconhecido retorna ok:false COMANDO DESCONHECIDO')`
- `it('jogador comum em comando de mestre recebe SÓ O MESTRE.')`
- `it('dono executa comando owner no próprio player')`
- `it('jogador em comando owner no player de outro recebe ESSE PERSONAGEM NÃO É SEU.')`
- `it('mestre executa comando owner em qualquer player')`
- `it('erro de regra vira ok:false com a mensagem e não muta o estado')`
- `it('players:useWeapon devolve data.result')`
- `it('map:pulse é permitido a qualquer um, não sincroniza nada e devolve fx')`
- `it('me:update altera só o próprio usuário e ignora username/isMaster/password vazio')`
- `it.each(TABELA)('%s sincroniza %p')` — **um teste table-driven** com cada comando e as
  coleções que ele deve sincronizar. Isso evita esquecer um `sync` (bug clássico: o servidor
  muda, mas ninguém vê).

**Comandos** (semântica na spec §5.2; aqui só o nome, a perm. e o sync):

| Comando | Perm | Sync |
|---|---|---|
| `items:add` / `items:update` / `items:remove` | M | items · items,recipes · items,players,loot,map |
| `recipes:add` / `recipes:update` / `recipes:remove` | M | recipes |
| `quests:add` / `quests:update` / `quests:remove` | M | quests |
| `players:add` / `players:update` | M | players |
| `players:remove` | M | players, quests |
| `players:damage` / `spendAp` / `adjustRads` / `adjustCoins` / `addXp` / `setImage` | M | players |
| `players:addItem` / `removeItem` / `setItemQuantity` | M | players |
| `players:equipWeapon` / `equipApparel` / `useAid` / `useWeapon` / `sell` / `craft` / `allocateSpecial` / `choosePerk` | D | players |
| `loot:add` / `loot:addBatch` / `loot:remove` | M | loot |
| `loot:claim` | D | loot, players |
| `map:setName` / `setAmbientLight` / `toggleEffect` / `setBackground` / `addObject` / `updateObject` / `moveObjects` / `removeObjects` / `addView` / `updateView` / `removeView` / `replace` | M | map |
| `map:damageObject` | M | map, loot |
| `map:pulse` | T | — (fx `fx:pulse`) |
| `me:update` | T | users |
| `admin:importLegacy` | M | todos |

**Pronto quando:** a tabela do `it.each` cobre 100% das chaves de `COMMANDS`. Para garantir,
um teste extra: `it('todo comando da tabela COMMANDS está no teste de sync')`.

---

### Fase 3 — `auth.ts` · `auth.spec.ts`

`authenticate(state, { username, password, register?, nickname? }, masters: string[]) → { user, created }`

- `it('register cria usuário com username em lowercase e sem espaços')`
- `it('register de jogador cria um Player vinculado com label = nickname')`
- `it('register de username em MASTER_USERNAMES cria mestre sem Player')`
- `it('register com username vazio lança USUÁRIO OBRIGATÓRIO')`
- `it('register de username existente lança USUÁRIO JÁ EXISTE')`
- `it('login com senha certa retorna o usuário e created=false')`
- `it('login com senha errada lança LOGIN INVÁLIDO')`
- `it('login de usuário inexistente lança LOGIN INVÁLIDO')`
- `it('toPublic remove password')`

---

### Fase 4 — `images.ts` · `images.spec.ts` (usa diretório temporário)

`extractDataUrls(value, uploadsDir) → value` (muta e retorna; percorre recursivamente).

- `it('troca data:image/png;base64 por /uploads/<uuid>.png e grava os bytes corretos')`
- `it('usa a extensão do mime (jpeg → .jpg, webp → .webp)')`
- `it('percorre objetos e arrays aninhados')` — ex.: `{ map: { objects: [{ backgroundImage: 'data:…' }] } }`
- `it('não mexe em strings comuns nem em URLs /uploads já existentes')`
- `it('ignora data: que não seja imagem')`

---

### Fase 5 — `db.ts` · `db.spec.ts` (diretório temporário + `jest.useFakeTimers()`)

`new Db({ dir, masters })` com `state`, `load()`, `touch()`, `flush()`.

- `it('sem db.json cria o estado com o seed (itens, 4 quests, 11 receitas, sem players)')`
- `it('com db.json carrega e cria db.backup.json')`
- `it('normaliza player antigo com os defaults (rads, special, equippedApparel, userId...)')`
- `it('normaliza mapa sem views e quest sem playerIds')`
- `it('acrescenta itens/receitas novas do seed sem sobrescrever as editadas')`
- `it('recalcula isMaster a partir de masters a cada load')`
- `it('vários touch() seguidos geram uma gravação só depois de 300 ms')`
- `it('flush grava de forma atômica: sem .tmp sobrando e o arquivo relido é igual ao state')`

---

### Fase 6 — Gateway + e2e · `test/game.e2e-spec.ts`

Implementação (o gateway inteiro):

```ts
@WebSocketGateway({ maxHttpBufferSize: 50e6 })
export class GameGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() io!: Server;
  constructor(private db: Db) {}

  afterInit(io: Server) {
    io.use((socket, next) => {
      try {
        const { user, created } = authenticate(this.db.state, socket.handshake.auth, this.db.masters);
        socket.data.user = user;
        socket.data.created = created;
        next();
      } catch (e) { next(e as Error); }        // cliente recebe connect_error com a mensagem
    });
  }

  handleConnection(socket: Socket) {
    if (socket.data.created) { this.db.touch(); this.sync(['users', 'players']); }
    socket.emit('state:snapshot', { me: toPublic(socket.data.user), ...publicState(this.db.state) });
  }

  @SubscribeMessage('cmd')
  onCmd(@ConnectedSocket() s: Socket, @MessageBody() { type, payload }: { type: string; payload: any }): Ack {
    extractDataUrls(payload, this.db.uploadsDir);
    const { result, ...ack } = execute(this.db.state, s.data.user, type, payload);
    if (result?.sync.length) { this.db.touch(); this.sync(result.sync); }
    if (result?.fx) this.io.emit(result.fx.event, result.fx.data);
    return ack;
  }

  private sync(keys: SyncKey[]) {
    for (const k of keys) this.io.emit(`sync:${k}`, k === 'users' ? this.db.state.users.map(toPublic) : this.db.state[k]);
  }
}
```

`main.ts` exporta `createApp({ dataDir, masters, port })`: `ServeStaticModule` para
`data/uploads` em `/uploads` e para `../dist/piplontra/browser` em `/`, mais `enableShutdownHooks()`.

**Testes e2e** (helper `connect(auth)` que devolve um socket já conectado ou rejeita no `connect_error`):
- `it('conexão sem credenciais é recusada com LOGIN INVÁLIDO')`
- `it('register pelo handshake recebe state:snapshot com me e o player criado')`
- `it('outro cliente conectado recebe sync:players quando alguém se cadastra')`
- `it('mestre manda quests:add e os dois clientes recebem sync:quests')`
- `it('jogador manda quests:add, recebe ok:false e ninguém recebe sync')`
- `it('ack de players:useWeapon traz data.result')`
- `it('payload com data URL vira /uploads/... e GET dessa URL responde 200')`
- `it('map:pulse chega como fx:pulse para todos')`
- `it('reiniciar a app com o mesmo DATA_DIR mantém os dados')` — `app.close()` (o shutdown faz flush) → `createApp` de novo → snapshot tem a quest

**Pronto quando:** `npm test && npm run test:e2e` verdes. A partir daqui o backend está
**funcionalmente completo**.

---

### Fase 7 — `admin:importLegacy` (migração do localStorage)

Unit tests em `rules.spec.ts`:
- `it('importLegacy substitui items, quests, recipes, loot e map')`
- `it('importLegacy converte arma/roupa por usuário em equippedWeaponId/equippedApparel')`
- `it('importLegacy descarta isYou, põe userId null e preserva players já vinculados a usuários')`
- `it('importLegacy normaliza o que veio (campos faltantes ganham defaults)')`

As imagens base64 do payload já viram arquivos pelo `extractDataUrls` do gateway, sem código extra.

---

### Fase 8 — Frontend (TDD leve com Jasmine, que o projeto já tem)

Criar **um** `FakeRealtime` de teste (grava os `command()` recebidos e expõe `emit(evento, dados)`
para simular o servidor). Para cada service migrado, **3 testes** antes de mexer nele:

- `it('aplica o state:snapshot no signal')`
- `it('aplica sync:<coleção> no signal')`
- `it('<método> envia o comando certo com o payload certo')` — um por método público mutador

Ordem: `RealtimeService` + `AuthService` + tela de login → `QuestsService` → `ItemsService` →
`RecipesService` → `PlayersService` (+ os dois services de equipamento derivados) →
`LootService` → `MapService` (+ `dragPreview` e pulse) → `UserService`/`AdminService` →
botão de migração. A tabela "Ajustes por arquivo" (spec §7.4) é o checklist, com estes ajustes:
- **sem** `UploadsService` (as data URLs continuam saindo do front);
- **sem** token: o `AuthService` guarda `{ username, password }` no localStorage e conecta com eles;
- `command(type, payload)` emite `'cmd'`.

Smoke test manual no fim: duas janelas (mestre + jogador) seguindo os critérios de pronto da spec §10.

---

## 5. Definição de pronto (geral)

- [ ] `npm test` e `npm run test:e2e` verdes, sem `it.todo` sobrando.
- [ ] Todo comando de `COMMANDS` aparece no teste de sync (Fase 2).
- [ ] Nenhuma regra de jogo duplicada no front além das **leituras** (`canCraft`, `totalWeight`, `carryCapacity`).
- [ ] `node dist/main.js` serve o Angular e o socket na mesma porta; duas máquinas na LAN jogando.
- [ ] Apagar `data/db.json` e subir de novo recria o seed; restaurar `db.backup.json` volta o jogo.
