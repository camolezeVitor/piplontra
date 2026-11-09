# Piplontra — servidor

Backend irrisório de propósito: NestJS + Socket.IO, estado em memória salvo em `data/db.json`.
Senha em texto puro e sem token. Regras e decisões: [`docs/spec-backend.md`](../docs/spec-backend.md) e [`docs/plano-backend.md`](../docs/plano-backend.md).

## Rodar

```bash
cp .env.example .env      # ajuste MASTER_USERNAMES (quem é o Mestre)
npm install
```

| Pra quê | Comando (na raiz do repo) |
|---|---|
| Desenvolver o front | `npm run server` (terminal 1) + `npm start` (terminal 2, proxy da 4200 → 3000) |
| Dia de jogo (porta única) | `npm run play` → abra `http://<ip-da-máquina>:3000` |
| Testes do servidor | `npm run server:test` |

Pra jogar pela internet: `cloudflared tunnel --url http://localhost:3000` (ou Tailscale).

## Arquivos

| Arquivo | O que faz |
|---|---|
| `src/rules.ts` | Regras do jogo (funções puras): craft, XP, munição, loot, mapa… |
| `src/commands.ts` | Tabela `tipo → { permissão, coleções a sincronizar, regra }` |
| `src/auth.ts` | Login/cadastro no handshake do socket |
| `src/images.ts` | Troca `data:image/...` dos comandos por arquivos em `data/uploads/` |
| `src/db.ts` | Carrega/normaliza/grava `data/db.json` (debounce + escrita atômica + `db.backup.json`) |
| `src/game.gateway.ts` | Liga tudo: evento `cmd` → regra → `sync:<coleção>` pra todo mundo |
| `src/seed.ts` | Catálogo, quests e receitas padrão (usados só quando não existe `db.json`) |

**Backup:** a pasta `data/` é o jogo inteiro. Copiar ela basta; `db.backup.json` é a versão do último boot.
