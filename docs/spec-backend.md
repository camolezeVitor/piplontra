# Spec — Backend irrisório do Piplontra (NestJS)

> **Objetivo único:** eu e o meu grupo jogarmos o RPG juntos, cada um no seu navegador,
> vendo tudo mudar **em tempo real** e sem perder nada quando alguém fecha a aba.
>
> **Não-objetivos (de propósito):** segurança de verdade, escala, multi-mesa, banco de dados,
> criptografia de senha, testes extensivos, Docker. Se algo aqui parecer "ingênuo demais",
> é intencional.

> **Implementação:** siga [plano-backend.md](plano-backend.md). Ele simplifica esta spec em
> quatro pontos e esses pontos têm precedência: um evento `cmd` só, login no handshake do
> socket (sem HTTP nem token), conversão automática de `data:` URL no servidor (sem endpoint
> de upload) e `payload.playerId` em todo comando de player. As **regras de jogo** descritas
> aqui continuam valendo.

### Revisão 2 (08/10/2026) — o que mudou em relação à v1

O frontend ganhou bastante coisa desde a primeira versão desta spec. Esta revisão incorpora:

- **Progressão do Player:** `image`, `rads`, `coins`, `level`, `xp`, `specialPoints`,
  `perkPoints`, `special`, `perkRanks` (+ catálogos `SPECIAL_STATS` e `PERKS`).
- **Regras de jogo novas no `PlayersService`:** `spendAp`, `adjustRads`, `adjustCoins`,
  `addXp` (com level-up), `allocateSpecialPoint`, `choosePerk`, `useAidItem`, `useWeapon`
  (gasta munição), `sellItem`, `craft`. Elas **passam a rodar no servidor** (§5.3).
- **Coleção nova `recipes`** (`RecipesService` + painel `admin-crafting` + aba CRAFTING).
- **Roupa equipada por slot** (`RoupaSelecionadaUsuarioService`, `Item.apparelSlot`), que vira
  `Player.equippedApparel`, igual à arma, que vira `Player.equippedWeaponId`.
- **Mapa:** polígonos de visão (`GameMap.views`), seleção múltipla com arraste em grupo e
  Delete em lote, e **pulses** (ping com o botão do meio), agora transmitidos para todos.
- As telas de INV agora listam o **inventário do jogador** (só itens com quantidade > 0).
  A observação da v1 sobre "INV lista o catálogo inteiro" ficou obsoleta. SPECIAL e PERKS
  deixaram de ser mock.

---

## 1. Decisões (e o porquê)

| Decisão | Escolha | Por quê |
|---|---|---|
| Framework | NestJS 11 (`@nestjs/platform-express`) | Pedido. |
| Tempo real | Socket.IO (`@nestjs/websockets` + `@nestjs/platform-socket.io`) | Reconexão automática, ack de comandos, broadcast trivial. |
| Persistência | **Um arquivo `data/db.json`** em memória + gravação com debounce | Zero infra. É uma mesa de 4–6 pessoas. |
| Imagens | Upload HTTP para `data/uploads/`, guarda só a **URL** | Hoje fundo do mapa, imagem de objeto, retrato do player e avatar são data URLs base64 — inviável transmitir a cada sync. |
| Senha | **Texto puro** no `db.json` | Pedido explícito. |
| "Token" | UUID fixo por usuário, gerado no cadastro | Sem JWT, sem expiração. |
| Mestre | Lista de usernames na env `MASTER_USERNAMES` | Hoje qualquer um vira mestre num checkbox. |
| Autoridade | **Servidor é a fonte da verdade**; cliente envia comandos e espelha o estado | As regras (craft, level-up, munição, loot) precisam ser atômicas e iguais para todos. |
| Formato do sync | Depois de cada comando, o servidor manda **a coleção inteira** que mudou | No cliente vira `signal.set(lista)`. As coleções são pequenas. |
| Monorepo | Backend em `server/` no mesmo repositório | Um lugar só. |
| Deploy | Nest serve também o build do Angular (porta única) | Fácil de expor por LAN, Tailscale ou `cloudflared tunnel`. |

---

## 2. Como o frontend funciona hoje (o que o backend substitui)

Todos os services de `src/app/shared/services/` seguem o mesmo padrão:

```ts
readonly items = signal<Item[]>([]);
constructor() { this.restore(); this.watchPersistence(); } // localStorage <-> signal
addItem(...) { this.items.update(list => [...list, item]); }
```

STAT, WEAPONS e APPAREL mostram o **jogador selecionado** em SESSÃO
(`PlayersService.selected`). Já o resto do INV (peso, AID, AMMO, JUNK, MISC, MODS) e a aba
CRAFTING usam o player com `isYou` (ver §7.4).

| Service atual | Chave localStorage | Destino |
|---|---|---|
| `ItemsService` | `piplontra:items:v1` | Coleção `items` |
| `QuestsService` | `piplontra:quests:v1` | Coleção `quests` |
| `RecipesService` | `piplontra:recipes:v1` | Coleção `recipes` (**nova**) |
| `PlayersService` | `piplontra:players:v1` | Coleção `players` (`selectedId` continua local) |
| `ArmaSelecionadaUsuarioService` | `piplontra:arma-selecionada-usuario` | Campo `Player.equippedWeaponId` |
| `RoupaSelecionadaUsuarioService` | `piplontra:roupa-selecionada-usuario` | Campo `Player.equippedApparel` |
| `LootService` | `piplontra:loot` | Coleção `loot` |
| `MapService` | `piplontra:map` | `map` (ver abaixo o que continua local) |
| `UserService` | `piplontra:user` | `users` (o próprio usuário logado) |
| `AdminService` | `piplontra:admin` | Derivado de `me.isMaster` (somente leitura) |
| `LootGeneratorService` | — | **Continua no cliente** (só sorteia; o resultado vira `loot:addBatch` / `map:updateObject`). |
| `AudioService`, `BloodEffectService` | — | Locais. |

**Estado do `MapService` que continua local (não vai pro servidor):** `selectedObjectIds`,
`contextMenu`, `previewAsPlayer`, `viewEditMode`, `drawingView` (polígono ainda em desenho),
`clipboard`, `importError`, `persistError`. Os `pulses` continuam vivendo só na memória,
mas **chegam por evento do servidor** (§5.1).

**Estratégia de migração do frontend:** os signals públicos e as assinaturas dos métodos dos
services ficam iguais sempre que possível; só o *miolo* troca `this.x.update(...)` por
`this.realtime.command(...)`. Os componentes quase não mudam. A única assinatura que muda de
verdade é `useWeapon` (vira `Promise`), ver §7.4.

---

## 3. Modelo de dados (servidor)

Copiar para `server/src/models/` os tipos e as constantes de `src/app/shared/models/`:
`item.ts` (incluindo `ITEM_RARITIES`, `WEAPON_AMMO_TYPE_TO_AMMO_LABEL` e `APPAREL_SLOTS`),
`quest.ts`, `loot.ts`, `game-map.ts`, `recipe.ts` (com `RECIPES`), `special.ts`
(com `createDefaultSpecial` e `carryCapacityFor`), `perk.ts` (com `PERKS`), `player.ts`
(com `xpRequiredForLevel`). São só TS, sem Angular. Aceito duplicar: é projeto pequeno, e o
servidor **precisa** de `PERKS`, `RECIPES`, `xpRequiredForLevel` e
`WEAPON_AMMO_TYPE_TO_AMMO_LABEL` para aplicar as regras.

Mudanças em relação ao modelo atual:

```ts
// Player — o que muda (o resto fica idêntico ao player.ts atual)
interface Player {
  // ...id, label, hp, maxHp, ap, maxAp, weapon, inventory, color,
  // ...image, rads, coins, level, xp, specialPoints, perkPoints, special, perkRanks
  userId: string | null;                 // NOVO — dono do personagem (null = sem dono)
  equippedWeaponId: string | null;       // NOVO — substitui ArmaSelecionadaUsuarioService
  equippedApparel: Partial<Record<ApparelSlot, string>>; // NOVO — substitui RoupaSelecionadaUsuarioService
  // isYou: REMOVIDO do servidor. O cliente calcula: player.userId === me.id
}

// Usuário — NOVO
interface User {
  id: string;
  username: string;      // único, lowercase
  password: string;      // TEXTO PURO, de propósito
  token: string;         // UUID, gerado no cadastro, nunca muda
  nickname: string;
  avatar: string | null; // URL "/uploads/xxx.png"
  color: string;         // cor do filtro do Pip-Boy
  isMaster: boolean;     // calculado no boot a partir de MASTER_USERNAMES
}
type PublicUser = Omit<User, 'password' | 'token'>;
```

`Item`, `Quest`, `LootEntry`, `Recipe`, `GameMap` (com `views`), `MapObject` e `MapView`
ficam **idênticos**. Todos os campos de imagem (`GameMap.backgroundImage`,
`MapObject.backgroundImage`, `Player.image`, `User.avatar`) continuam sendo `string | null`,
mas passam a conter uma URL `/uploads/...` em vez de data URL. `<img [src]>` e
`background-image` funcionam igual.

### 3.1 Arquivo `data/db.json`

```jsonc
{
  "version": 1,
  "users":   [],
  "items":   [],
  "quests":  [],
  "recipes": [],
  "players": [],
  "loot":    [],
  "map":     { "name": "", "backgroundImage": null, "objects": [], "ambientLight": 100, "effects": [], "views": [] }
}
```

**Boot:**
- Se o arquivo não existe, cria com o seed: `items` (todo o `ItemsService.seedDefaults()`
  atual), `quests` (`QuestsService.seedDefaults()`), `recipes` (`RECIPES`). Mover para
  `server/src/store/seed.ts`. `players` começa vazio (os players nascem do cadastro, §4).
- Se existe, copia para `data/db.backup.json` antes de carregar.
- **Normaliza ao carregar** (a mesma lógica de backfill que hoje está espalhada no front):
  - `items`: `backfillMissingFields` (merge com o seed por `label` + `category`);
  - `recipes`: `withMissingDefaults` (acrescenta as receitas padrão cujo `id` não existe);
  - `players`: `{ ...createPlayer(), equippedWeaponId: null, equippedApparel: {}, userId: null, ...p }`;
  - `map`: `{ ...createEmptyGameMap(), ...map }`.
  Assim, quando o front ganhar campos novos no futuro, basta atualizar os defaults no servidor.

---

## 4. Autenticação (irrisória)

### HTTP

| Rota | Body | Resposta |
|---|---|---|
| `POST /api/auth/register` | `{ username, password, nickname? }` | `{ token, user: PublicUser }` |
| `POST /api/auth/login` | `{ username, password }` | `{ token, user: PublicUser }` |

- `username` passa por trim + lowercase; 409 se já existe, 400 se vazio.
- Login: `password === user.password`. 401 se não bater.
- No **register** de quem **não** é mestre, o servidor cria um `Player` com
  `label = nickname || username`, `userId = user.id`, cor aleatória e os valores padrão de
  `createPlayer()`. O mestre não ganha Player (regra já existente: "O Mestre NÃO é um Player").
- `isMaster = MASTER_USERNAMES.split(',').includes(username)`, recalculado em todo boot.

### Socket

O cliente conecta com `io({ auth: { token } })`. Em `handleConnection`, o gateway resolve o
usuário pelo token: se não achar, `socket.disconnect(true)`; se achar, guarda em
`socket.data.user` e emite `state:snapshot`.

### Upload

`POST /api/uploads` (multipart, campo `file`, header `Authorization: <token>`), limite 20 MB,
só `image/*`. Salva em `data/uploads/<uuid>.<ext>` e devolve `{ url }`. Servido estático em `/uploads`.

---

## 5. Protocolo em tempo real

### 5.1 Servidor → clientes

| Evento | Payload | Quando |
|---|---|---|
| `state:snapshot` | `{ me, users, items, quests, recipes, players, loot, map }` | Na conexão e em toda reconexão. |
| `sync:items` / `sync:quests` / `sync:recipes` / `sync:players` / `sync:loot` | lista completa | Depois de um comando que mude a coleção. |
| `sync:map` | `GameMap` | idem |
| `sync:users` | `PublicUser[]` | Cadastro ou mudança de perfil. |
| `fx:pulse` | `{ x, y, label?, from: userId }` | Alguém deu ping no mapa. **Não persiste.** O cliente chama o `addPulse` local, que já some sozinho em 1,5 s. |
| `fx:damage` *(opcional, fase 3)* | `{ target: 'player' \| 'object', id, amount }` | Para todos tocarem som/sangue, não só quem clicou. |

Broadcast sempre com `server.emit(...)` (**inclui quem mandou o comando**).

### 5.2 Comandos (cliente → servidor)

Todos usam **ack**: `socket.emitWithAck(evento, payload)` devolve
`{ ok: true, data?: unknown }` ou `{ ok: false, error: string }`.

**Permissões:**
- **M**: só o mestre.
- **D**: o dono do player (`player.userId === user.id`) **ou** o mestre.
- **T**: qualquer usuário logado.

> Hoje a UI mostra para o mestre botões como USAR, VENDER, CRAFTAR, alocar SPECIAL e escolher
> PERK (`@if (admin.isAdmin())`). O servidor aceita esses comandos também do **dono**
> (perm. D), então liberar para os jogadores depois é só mudar o `@if` no front. Se a mesa
> preferir que só o mestre faça isso, troque D por M na tabela — é uma linha no handler.

#### Catálogos (itens, receitas, quests)

| Comando | Payload | Perm. | Efeito | Sync |
|---|---|---|---|---|
| `items:add` | `{ item }` | M | push (id vem do cliente; rejeita duplicado) | items |
| `items:update` | `{ id, changes }` | M | merge preservando `id` e `category`. **Se `label` mudar**, propaga o novo label para `recipes[].inputs/outputs[].itemLabel` (receitas referenciam por label) | items (+ recipes) |
| `items:remove` | `{ id }` | M | remove + **cascata**: inventários, `equippedWeaponId`, `equippedApparel`, `loot`, `MapObject.loot` | items, players, loot, map |
| `recipes:add` | `{ recipe }` | M | push | recipes |
| `recipes:update` | `{ id, changes }` | M | merge preservando `id` | recipes |
| `recipes:remove` | `{ id }` | M | remove | recipes |
| `quests:add` / `quests:update` / `quests:remove` | `{ quest }` / `{ id, changes }` / `{ id }` | M | idem | quests |

#### Players: administração (mestre)

| Comando | Payload | Perm. | Efeito |
|---|---|---|---|
| `players:add` | `{ player }` | M | push |
| `players:update` | `{ id, changes }` | M | merge preservando `id` (é o que o `admin-players` usa para nome, cor, HP/AP, `userId`) |
| `players:remove` | `{ id }` | M | remove |
| `players:setImage` | `{ id, url \| null }` | M | `image = url` |
| `players:damage` | `{ id, amount }` | M | `hp = max(0, hp - amount)`, só se `amount > 0` |
| `players:spendAp` | `{ id, amount }` | M | `ap = max(0, ap - amount)` |
| `players:adjustRads` | `{ id, amount }` | M | `rads = max(0, rads + amount)` (aceita negativo) |
| `players:adjustCoins` | `{ id, amount }` | M | `coins = max(0, coins + amount)` (aceita negativo) |
| `players:addXp` | `{ id, amount }` | M | soma XP com laço de level-up: cada nível dá +1 `specialPoints` e +1 `perkPoints` (cópia exata do `addXp` atual) |
| `players:addItem` | `{ playerId, itemId, quantity }` | M | soma na pilha ou cria |
| `players:removeItem` | `{ playerId, itemId }` | M | remove a pilha |
| `players:setItemQuantity` | `{ playerId, itemId, quantity }` | M | `<= 0` remove |

Todos sincronizam `players`.

#### Players: ações do personagem (dono ou mestre)

| Comando | Payload | Perm. | Efeito | Ack `data` |
|---|---|---|---|---|
| `players:equipWeapon` | `{ playerId, itemId \| null }` | D | seta `equippedWeaponId`. O toggle (clicar na equipada desequipa) continua decidido no cliente, que manda `null` | — |
| `players:equipApparel` | `{ playerId, slot, itemId \| null }` | D | `null` desequipa o slot; senão substitui o que estava no slot | — |
| `players:useAid` | `{ playerId, itemId }` | D | regra de `useAidItem`: item precisa ser `aid` e estar no inventário; `hp` é limitado a `0..maxHp`, `rads` a `>= 0`; tira 1 do estoque | — |
| `players:useWeapon` | `{ playerId }` | D | usa a **arma equipada** do servidor; regra de `useWeapon` (`WEAPON_AMMO_TYPE_TO_AMMO_LABEL`, gasta 1 da munição) | `{ result: 'fired' \| 'no-ammo' }` |
| `players:sell` | `{ playerId, itemId, quantity }` | D | regra de `sellItem`: `coins += value × qtd`, tira do estoque. **Se a pilha zerar e o item estiver equipado (arma ou roupa), desequipa** (hoje isso está no `apparel.component`, só para roupa) | — |
| `players:craft` | `{ playerId, recipeId }` | D | regra de `canCraft` + `craft`, **atômica**: valida todos os insumos antes de consumir qualquer um. Erro `'FALTAM INSUMOS'` se não tiver | — |
| `players:allocateSpecial` | `{ playerId, stat }` | D | precisa ter `specialPoints > 0`; +1 no atributo | — |
| `players:choosePerk` | `{ playerId, perkId }` | D | precisa ter `perkPoints > 0` e rank abaixo de `PERKS[].maxRank` | — |

Todos sincronizam `players`.

#### Loot

| Comando | Payload | Perm. | Efeito | Sync |
|---|---|---|---|---|
| `loot:add` | `{ itemId, quantity, source }` | M | push | loot |
| `loot:addBatch` | `{ items, source }` | M | push vários (gerador de loot) | loot |
| `loot:remove` | `{ id }` | M | remove | loot |
| `loot:claim` | `{ lootId, playerId }` | D | **atômico**: se o loot ainda existe, remove e soma no inventário; senão erro `'JÁ PEGARAM'` | loot, players |

#### Mapa

| Comando | Payload | Perm. | Efeito |
|---|---|---|---|
| `map:setName` | `{ name }` | M | |
| `map:setAmbientLight` | `{ value }` | M | clamp 0..100, arredondado |
| `map:toggleEffect` | `{ type }` | M | |
| `map:setBackground` | `{ url \| null }` | M | |
| `map:addObject` | `{ object }` | M | push (Ctrl+clique, Ctrl+V) |
| `map:updateObject` | `{ id, patch }` | M | merge (editor de botão direito, girar lanterna com R) |
| `map:moveObjects` | `{ moves: { id, x, y }[] }` | M | **novo**: move vários de uma vez (arraste em grupo) → 1 sync em vez de N |
| `map:removeObjects` | `{ ids }` | M | **novo**: remove em lote (Delete/Backspace com seleção múltipla). Também serve para remover um só |
| `map:damageObject` | `{ id, amount }` | M | regra de `damageObject`: ao morrer, `loot` do inimigo vai para `loot` com `source = label` e o objeto some |
| `map:addView` | `{ view: MapView }` | M | push (polígono concluído; o desenho em andamento é local) |
| `map:updateView` | `{ id, patch }` | M | renomear, `enabled` on/off |
| `map:removeView` | `{ id }` | M | |
| `map:replace` | `{ map }` | M | import de JSON: substitui tudo e converte `data:` URLs em uploads |
| `map:pulse` | `{ x, y, label? }` | **T** | não altera estado; só reemite `fx:pulse` para todos |

Todos (menos `map:pulse`) sincronizam `map`; `damageObject` também sincroniza `loot`.

#### Perfil e migração

| Comando | Payload | Perm. | Efeito | Sync |
|---|---|---|---|---|
| `me:update` | `{ nickname?, color?, avatar?, password? }` | T (si mesmo) | merge no próprio usuário | users |
| `admin:importLegacy` | ver §8 | M | migração única do localStorage | tudo |

> Node é single-thread e cada handler é síncrono (lê → altera → marca dirty), então não existe
> condição de corrida: dois cliques simultâneos em `loot:claim` ou dois `players:craft`
> seguidos com insumo para um só se resolvem sozinhos (o segundo recebe erro).

### 5.3 Por que as regras saem do front

`useAidItem`, `useWeapon`, `sellItem`, `craft`, `addXp`, `choosePerk` e
`allocateSpecialPoint` hoje leem o estado, decidem e escrevem várias vezes
(ex.: `craft` chama `setItemQuantity` em loop). Num cenário com várias abas, cada cliente
decidiria em cima de uma cópia possivelmente desatualizada. No servidor elas viram **funções
puras** em `server/src/game/rules.ts`, do tipo `(state, args) => void | throw`, copiadas
quase linha a linha do `PlayersService` atual. No cliente, sobram só as **leituras**:
`totalWeight`, `carryCapacity` e `canCraft` (para habilitar o botão), que continuam como hoje.

### 5.4 Sem "update otimista" (com uma exceção)

O cliente **não** altera seus signals antes da resposta; ele espera o `sync:*`. Em LAN isso
leva < 10 ms; pela internet, 50–150 ms, o que é aceitável para RPG de mesa.

**Exceção: arrastar objetos no mapa** (`map-object.component.ts`, que agora arrasta a seleção
inteira). Durante o arrasto, o componente desenha as posições a partir de um estado local
`dragPreview: Map<id, {x,y}>` e manda **um** `map:moveObjects` por troca de tile, com todas
as posições. No `pointerup`, limpa o preview e volta a valer o que veio do servidor. Sem isso
os objetos "pulam pra trás" quando um sync atrasado chega no meio do arrasto.

---

## 6. Estrutura do servidor

```
server/
├─ package.json
├─ tsconfig.json
├─ nest-cli.json
├─ .env.example          # PORT=3000, MASTER_USERNAMES=vitor, DATA_DIR=./data
├─ data/                 # gitignored
│  ├─ db.json
│  ├─ db.backup.json
│  └─ uploads/
└─ src/
   ├─ main.ts
   ├─ app.module.ts
   ├─ models/            # cópia dos tipos/constantes do front + User/PublicUser
   ├─ store/
   │  ├─ store.service.ts   # estado em memória + load/normalize/save do db.json
   │  └─ seed.ts            # itens, quests e receitas padrão
   ├─ auth/
   │  ├─ auth.controller.ts # register / login
   │  └─ auth.service.ts    # findByToken, toPublic
   ├─ uploads/
   │  ├─ uploads.controller.ts
   │  └─ data-url.ts        # persistDataUrl(): data:image/... -> arquivo -> "/uploads/x.png"
   └─ game/
      ├─ game.gateway.ts    # TODOS os @SubscribeMessage (só roteia + permissão)
      └─ rules.ts           # regras puras: addToInventory, useAid, useWeapon, sell, craft,
                            # addXp, allocateSpecial, choosePerk, damageEnemy, cascadeRemoveItem…
```

Um módulo só (`AppModule`). Não criar um módulo Nest por entidade.

### 6.1 Dependências

```bash
npm i @nestjs/common @nestjs/core @nestjs/platform-express \
      @nestjs/websockets @nestjs/platform-socket.io socket.io \
      @nestjs/config reflect-metadata rxjs
npm i -D @nestjs/cli typescript @types/node @types/express @types/multer
```

Sem `class-validator`, ORM, `bcrypt`, JWT ou Passport.

### 6.2 `StoreService` (o "banco")

```ts
@Injectable()
export class StoreService implements OnModuleInit, BeforeApplicationShutdown {
  state!: DbState;
  private saveTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    // mkdir DATA_DIR/uploads; se db.json existe: copia p/ db.backup.json, carrega e normaliza (§3.1);
    // senão: cria com seed. Recalcula users[].isMaster a partir de MASTER_USERNAMES.
  }

  /** Toda mutação passa por aqui. */
  touch() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.flush(); }, 300);
  }

  flush() {
    // writeFileSync(tmp, JSON.stringify(state, null, 2)); renameSync(tmp, db.json)
    // escrita atômica: o db.json nunca fica pela metade se o processo cair
  }

  beforeApplicationShutdown() { this.flush(); } // exige app.enableShutdownHooks()
}
```

### 6.3 `GameGateway` (esqueleto)

```ts
type Ack = { ok: true; data?: unknown } | { ok: false; error: string };
type SyncKey = 'items' | 'quests' | 'recipes' | 'players' | 'loot' | 'map' | 'users';
type Perm = 'master' | 'owner' | 'any';

@WebSocketGateway({ maxHttpBufferSize: 50e6 }) // 50 MB só por causa de map:replace/importLegacy
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private store: StoreService, private auth: AuthService) {}

  handleConnection(socket: Socket) {
    const user = this.auth.findByToken(socket.handshake.auth?.['token']);
    if (!user) return socket.disconnect(true);
    socket.data.user = user;
    socket.emit('state:snapshot', { me: this.auth.toPublic(user), ...this.publicState() });
  }

  @SubscribeMessage('players:craft')
  craft(@ConnectedSocket() s: Socket, @MessageBody() p: { playerId: string; recipeId: string }): Ack {
    return this.run(s, { perm: 'owner', playerId: p.playerId }, state => {
      rules.craft(state, p.playerId, p.recipeId);   // lança Error('FALTAM INSUMOS')
      return { sync: ['players'] };
    });
  }

  @SubscribeMessage('players:useWeapon')
  useWeapon(@ConnectedSocket() s: Socket, @MessageBody() p: { playerId: string }): Ack {
    return this.run(s, { perm: 'owner', playerId: p.playerId }, state => {
      const result = rules.useWeapon(state, p.playerId);   // 'fired' | 'no-ammo'
      return { sync: ['players'], data: { result } };
    });
  }

  @SubscribeMessage('map:pulse')
  pulse(@ConnectedSocket() s: Socket, @MessageBody() p: { x: number; y: number; label?: string }): Ack {
    this.server.emit('fx:pulse', { ...p, from: s.data.user.id });
    return { ok: true };
  }

  /** Checa permissão, executa, salva, faz broadcast. Erros viram { ok:false }. */
  private run(
    s: Socket,
    access: { perm: Perm; playerId?: string },
    fn: (state: DbState) => { sync: SyncKey[]; data?: unknown } | void,
  ): Ack {
    try {
      const user = s.data.user as User;
      if (!user.isMaster) {
        if (access.perm === 'master') throw new Error('SÓ O MESTRE.');
        if (access.perm === 'owner') {
          const player = this.store.state.players.find(pl => pl.id === access.playerId);
          if (player?.userId !== user.id) throw new Error('ESSE PERSONAGEM NÃO É SEU.');
        }
      }
      const out = fn(this.store.state) ?? { sync: [] };
      if (out.sync.length) { this.store.touch(); out.sync.forEach(k => this.broadcast(k)); }
      return { ok: true, data: out.data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  private broadcast(key: SyncKey) {
    if (key === 'users') this.server.emit('sync:users', this.store.state.users.map(u => this.auth.toPublic(u)));
    else this.server.emit(`sync:${key}`, this.store.state[key]);
  }
}
```

- No Nest, o valor retornado por um `@SubscribeMessage` vira a resposta do ack. Por isso o
  `run()` **retorna** `{ok:false}` em vez de lançar `WsException`, que iria para o evento
  `exception` e não para o ack.
- **As regras mutam o `state` no lugar** (no servidor não há signal para respeitar
  imutabilidade). Mas `rules.craft` e semelhantes devem **validar tudo antes de mutar**, para
  não deixar o estado pela metade quando lançam erro.
- **Merges de `update`:** mesma regra do front (`{ ...atual, ...changes, id: atual.id }`; em
  itens, preservar também `category`). Ignorar `changes` que não sejam objeto. Não há outra
  validação de schema.

### 6.4 `main.ts`

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.setGlobalPrefix('api');                                  // só afeta controllers
app.enableShutdownHooks();
app.useStaticAssets(join(DATA_DIR, 'uploads'), { prefix: '/uploads' });
app.useStaticAssets(join(__dirname, '../../dist/piplontra/browser')); // build do Angular
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');       // 0.0.0.0 = acessível na LAN
```

O app não usa rotas (`app.routes.ts` está vazio), então não precisa de fallback de SPA.

---

## 7. Mudanças no frontend

### 7.1 Novos arquivos

**`shared/services/realtime.service.ts`**

```ts
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;
  readonly connected = signal(false);
  readonly snapshot = signal<Snapshot | null>(null);

  connect(token: string) { /* io({ auth: { token } }); connect/disconnect -> connected;
                              'state:snapshot' -> snapshot.set(...);
                              'connect_error' com token inválido -> auth.logout() */ }
  disconnect() { ... }

  on<T>(event: string, handler: (data: T) => void) { /* registra mesmo antes de conectar */ }

  async command<T = void>(event: string, payload: unknown): Promise<T> {
    const res = await this.socket!.timeout(5000).emitWithAck(event, payload);
    if (!res.ok) throw new Error(res.error);
    return res.data as T;
  }
}
```

**`shared/services/auth.service.ts`**: guarda o token em `localStorage['piplontra:token']`;
expõe `login()`, `register()`, `logout()`, `me = signal<PublicUser | null>` (alimentado pelo
snapshot e por `sync:users`) e `isLoggedIn`.

**`features/login/login.component.ts`**: tela no estilo Pip-Boy (`pipOutline`, `pip-card`,
classe `.field`) com username, senha e os botões ENTRAR / CRIAR CONTA. Mostra o erro do servidor.

**`shared/services/uploads.service.ts`**: `upload(file: File): Promise<string>` (`fetch`
para `/api/uploads` com `Authorization: token`). Substitui **todos** os `readAsDataUrl` que
hoje existem em `map.service.ts`, `players.service.ts` e `user-configs.component.ts`.

### 7.2 `app.ts`

```html
@if (!auth.isLoggedIn()) { <pip-login /> }
@else if (!realtime.snapshot()) { <p>CONECTANDO...</p> }
@else { ...layout atual... }
```

E um aviso discreto `SEM CONEXÃO` quando `realtime.connected()` for `false` depois da
primeira conexão (o Socket.IO reconecta sozinho e reenvia o snapshot).

### 7.3 Padrão de refatoração dos services

```ts
@Injectable({ providedIn: 'root' })
export class QuestsService {
  private readonly rt = inject(RealtimeService);
  readonly quests = signal<Quest[]>([]);
  readonly saveError = signal<string | null>(null);

  constructor() {
    this.rt.on<Snapshot>('state:snapshot', s => this.quests.set(s.quests));
    this.rt.on<Quest[]>('sync:quests', list => this.quests.set(list));
  }

  addQuest(partial: Partial<Quest> = {}): Quest {
    const quest = createQuest(partial);           // id continua gerado no cliente
    this.send('quests:add', { quest });
    return quest;                                 // assinatura síncrona mantida
  }
  updateQuest(id: string, changes: Partial<Quest>) { this.send('quests:update', { id, changes }); }
  removeQuest(id: string) { this.send('quests:remove', { id }); }

  private send(event: string, payload: unknown) {
    this.rt.command(event, payload)
      .then(() => this.saveError.set(null))
      .catch(e => this.saveError.set(e.message));
  }
}
```

Como o id continua sendo gerado no cliente (`createX()`, `generateId()`), métodos como
`addPlayer()`, `addObject()` e `addRecipe()` continuam devolvendo a entidade na hora, e o
`select(id)` que vem em seguida funciona: o `computed` resolve quando o `sync:*` chega.

Remover de todos os services: `restore()`, `watchPersistence()`, `seedDefaults()`,
`backfillMissingFields()`, `withMissingDefaults()`, as constantes `STORAGE_KEY` e os
`readAsDataUrl`.

### 7.4 Ajustes por arquivo

| Arquivo | Mudança |
|---|---|
| `models/player.ts` | Adicionar `userId`, `equippedWeaponId`, `equippedApparel`; remover `isYou` de `Player` e de `createPlayer()`. |
| `services/players.service.ts` | Todos os mutadores viram comandos (§5.2). `canCraft`, `totalWeight` e `carryCapacity` ficam como estão (leitura). `useWeapon(playerId)` passa a ser `Promise<'fired' \| 'no-ammo'>` e não recebe mais o `Item` (o servidor usa a arma equipada). `setPlayerImage` faz upload e depois manda `players:setImage`. Novo `me = computed(() => players().find(p => p.userId === auth.me()?.id) ?? null)`. `selectedId` inicial: `me()?.id` para jogador, primeiro da lista para o mestre. |
| `services/arma-selecionada-usuario.service.ts` | Manter a API (`armaDoUsuario`, `selecionar`, `limpar`), mas derivar de `players()[].equippedWeaponId` e enviar `players:equipWeapon`. Assim `players-pannel`, `map-object`, `map-object-context-menu`, `weapons` e `damage-status` não mudam. |
| `services/roupa-selecionada-usuario.service.ts` | Mesma coisa: `equipadoNoSlot` e `equipamentos` derivam de `equippedApparel`; `selecionar`/`desequipar` enviam `players:equipApparel`. `apparel`, `defense-status` e `players-pannel` não mudam. |
| `services/recipes.service.ts` | Comandos `recipes:*`. |
| `services/admin.service.ts` | `isAdmin = computed(() => auth.me()?.isMaster ?? false)`. Remover `setAdmin`/`toggle`. |
| `services/user.service.ts` | Signals refletem `auth.me()`. Setters viram métodos que mandam `me:update`, **com debounce de ~400 ms** em nickname e senha (o input dispara a cada tecla). `rgb` continua igual. |
| `services/map.service.ts` | Comandos `map:*`. `removeSelected()` passa a mandar **um** `map:removeObjects`. `finishDrawingView()` monta o `MapView` localmente e manda `map:addView`. `updateView`, `toggleViewEnabled` e `removeView` viram comandos. `addPulse` continua local (só desenha); o `map.component` passa a mandar `map:pulse`, e o service escuta `fx:pulse` → `addPulse`. Imagens via upload. `importFromJson` → `map:replace`. `downloadJson` continua 100% local. |
| `services/loot.service.ts` | Comandos `loot:*`; novo `claim(lootId, playerId)`. |
| `features/loot/loot-drawer.component.ts` | `claim()` chama `loot.claim(entry.id, player.id)` (atômico) no lugar de `addItem` + `remove`. Para jogador comum, o alvo é `players.me()`. |
| `features/map/map.component.ts` | Botão do meio: `realtime.command('map:pulse', …)` em vez de `map.addPulse(…)`. O pulse do Alt+clique (feedback de "coordenada copiada") pode continuar local. |
| `features/map/map-object.component.ts` | `dragPreview` local durante o arrasto + `map:moveObjects` (§5.4). |
| `features/map/map-object-context-menu.component.ts` | `useWeapon(object)` passa a usar `await` (`'no-ammo'` → mesmo feedback de hoje). "Copiar retrato pro objeto" segue igual: agora copia uma URL, não um base64. |
| `features/admin/players/admin-players.component.ts` | Trocar o selo `VOCÊ` (`player.isYou`) por um `<select>` "DONO" com os `users` não-mestre → `players:update { userId }`. |
| `features/players/players-pannel.component.ts` | `player.isYou` → `player.userId === auth.me()?.id`. Botão `EXIT` → `auth.logout()`. |
| `features/header/configs/user-configs.component.ts` | Avatar via upload. Checkbox "SOU O MESTRE" vira só leitura. `@usuário` vira só leitura (é a chave de login). |
| `routes/inv/inv.component.ts`, `aid`, `ammo`, `junk`, `misc`, `mods`, `routes/inv/crafting/crafting.component.ts` | **Inconsistência atual:** essas telas usam `players().find(p => p.isYou)` para contar, usar, vender e craftar, enquanto `weapons`, `apparel` e STAT usam `playersService.selected()`. Com `isYou` saindo do modelo, padronizar tudo em `selected()`: para o jogador comum, o padrão é ele mesmo; o mestre vê e age em quem estiver clicado em SESSÃO. `craft(recipe)` → `players:craft { recipeId }`. |
| `routes/inv/apparel/apparel.component.ts` | Remover o "desequipa se zerou" depois da venda: o servidor já faz isso em `players:sell`. |
| `angular.json` + `proxy.conf.json` (novo) | No `ng serve`, proxy de `/api`, `/uploads` e `/socket.io` (`ws: true`) para `http://localhost:3000`. |
| `package.json` | `npm i socket.io-client`. |

---

## 8. Migração do que já está no localStorage

Provavelmente o mestre já montou mapa, itens, receitas e jogadores no navegador dele.

1. No painel de admin, se `isAdmin()` e existir alguma chave antiga `piplontra:*`, mostrar o
   botão **"ENVIAR DADOS LOCAIS PRO SERVIDOR"**.
2. O botão lê `items:v1`, `quests:v1`, `recipes:v1`, `players:v1`, `loot`, `map`,
   `arma-selecionada-usuario` e `roupa-selecionada-usuario` e manda tudo em `admin:importLegacy`.
3. O servidor:
   - substitui `items`, `quests`, `recipes`, `loot` e `map`;
   - em `players`: `equippedWeaponId = arma[player.id] ?? null`,
     `equippedApparel = roupa[player.id] ?? {}`, descarta `isYou`, `userId: null`;
     preserva os players já vinculados a usuários (cadastrados antes da importação);
   - converte **todas** as `data:` URLs (fundo do mapa, imagens de objetos, `Player.image`)
     em arquivos de `uploads/`;
   - normaliza (§3.1) e faz broadcast de tudo.
4. Com `ok`, o cliente apaga as chaves antigas.
5. Depois, o mestre vincula cada player importado ao dono no `<select>` DONO, e apaga os
   players duplicados que o cadastro criou.

---

## 9. Como rodar e jogar

```bash
# desenvolvimento (2 terminais)
cd server && npm run start:dev       # http://localhost:3000
npm start                            # http://localhost:4200 (proxy -> 3000)

# dia de jogo (1 processo, 1 porta)
npm run build                        # gera dist/piplontra/browser
cd server && npm run build && node dist/main.js
```

O mestre compartilha `http://<ip-da-máquina>:3000` (mesma rede) ou expõe com
`cloudflared tunnel --url http://localhost:3000` / Tailscale (internet). Pelo túnel vem HTTPS,
o que também faz `crypto.randomUUID()` funcionar no cliente (hoje existe um fallback em
`shared/utils/id.ts` justamente para HTTP na LAN).

Backup: a pasta `server/data/` **é** o jogo. Copiar ela basta.

---

## 10. Ordem de implementação (com critério de pronto)

1. **Servidor base**: Nest, `StoreService`, seed, normalização, `db.json`.
   ✅ Subir o servidor cria `data/db.json` com o catálogo inteiro de itens, as 4 quests e as 11 receitas.
2. **Auth HTTP**: register/login, criação automática do Player, `MASTER_USERNAMES`.
   ✅ `curl` de register devolve token; usuário e player aparecem no `db.json`.
3. **Gateway + snapshot + quests** (a coleção mais simples, de ponta a ponta).
   ✅ Duas abas: o mestre cria uma quest numa e ela aparece na outra sem F5; reiniciar o servidor mantém a quest.
4. **Front: login, `RealtimeService`, `AuthService`, `QuestsService` migrado, proxy.**
5. **Items + recipes + players (administração)** + `AdminService` derivado.
   ✅ Mestre dá dano, XP (com level-up), rads e tampas num jogador → todos veem na hora.
6. **Ações do personagem** (`rules.ts`): equipar arma e roupa, usar ajuda, usar arma, vender, craftar, SPECIAL, perk.
   ✅ Craftar com insumo para uma unidade só, clicando duas vezes rápido → só a primeira passa.
   ✅ Jogador comum tentando agir no player de outro recebe `ESSE PERSONAGEM NÃO É SEU.`
7. **Loot** (com claim atômico).
   ✅ Dois jogadores pegando o mesmo loot ao mesmo tempo → só um recebe.
8. **Uploads + mapa** (views, `moveObjects`, `removeObjects`, drag preview, `damageObject`, pulse).
   ✅ Mestre arrasta um grupo → jogadores veem andar tile a tile; inimigo morre → loot aparece
   para todos; view habilitada recorta a visão dos jogadores; ping com botão do meio aparece para todos.
9. **Perfil (`me:update`)** e **migração do localStorage**.
10. **Servir o build do Angular pelo Nest** e testar pelo túnel.
11. *(opcional)* `fx:damage` para som/sangue em todos os clientes.

---

## 11. Fora do escopo desta versão (mas anotado)

Ainda são **dados fixos no código**, e nada é salvo deles hoje:

- `routes/stats/status/limbs-status` (barras de membros com valores fixos)
- `routes/stats/status/use-stimpack` / `use-radaway` (`(5)` fixo, o clique só toca som)
- `routes/data/workshops`, `routes/data/stats`

Caminho natural quando ganharem vida: `Player.limbs: { head, lArm, rArm, lLeg, rLeg }`; os
botões STIMPAK/RADAWAY contando a partir do inventário e chamando `players:useAid` (o comando
já existe); workshops como mais uma coleção do mestre, igual a `quests`. Nada disso exige
protocolo novo.

### Limitações aceitas

- Senha em texto puro e token eterno. Aceito.
- **As views e a escuridão são só visuais**: o cliente do jogador recebe o mapa inteiro, com
  inimigos escondidos inclusive. Quem abrir o DevTools vê tudo. Para uma mesa de amigos, ok.
- Uma mesa só, um mapa só (como o front já é).
- O sync manda a coleção inteira. Se o mapa ficar enorme e o arrasto pesar pela internet,
  trocar `moveObjects`/`updateObject` por um evento granular `sync:mapObjects { patches }`.
- Uploads órfãos (imagem trocada) ficam no disco. Irrelevante no volume de uma mesa.
- Receitas referenciam itens por `label`. O servidor propaga renomeações (§5.2), mas dois
  itens com o mesmo label continuam ambíguos, como já acontece hoje no front.
