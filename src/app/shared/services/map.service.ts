import { Injectable, computed, inject, signal } from "@angular/core";
import { GameMapFile, MAP_FILE_VERSION, MapEffectType, MapObject, MapView, MapViewPoint, createMapObject } from "@shared/models/game-map";
import { AdminService } from "@shared/services/admin.service";
import { RealtimeService } from "@shared/services/realtime.service";
import { generateId } from "@shared/utils/id";

export interface MapContextMenu {
    objectId: string;
    x: number;
    y: number;
}

/** Um "pulse" momentâneo numa célula (botão do meio, ou feedback do Alt+clique) — não é persistido. */
export interface MapPulse {
    id: string;
    x: number;
    y: number;
    label?: string;
    /** Cor do personagem de quem pingou (anel e etiqueta). Ausente = branco. */
    color?: string;
}

/** O que o servidor manda em `fx:pulse`: posição + nome/cor do personagem de quem clicou. */
interface PulseEvent {
    x: number;
    y: number;
    name?: string;
    color?: string;
}

function isGameMapFile(value: unknown): value is GameMapFile {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return v['version'] === MAP_FILE_VERSION && typeof v['map'] === 'object' && v['map'] !== null;
}

function slugify(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * Mapa do Mestre. O que é do jogo (nome, fundo, objetos, luz, efeitos, views)
 * espelha o servidor; o que é de edição (seleção, menu, desenho de view,
 * pulses, "ver como jogador", clipboard) é local de cada navegador.
 * Só o Mestre (`AdminService.isAdmin`) edita — o servidor recusa o resto.
 */
@Injectable({ providedIn: 'root' })
export class MapService {
    private readonly rt = inject(RealtimeService);
    private readonly admin = inject(AdminService);

    readonly name = computed(() => this.rt.map().name);
    readonly backgroundImage = computed(() => this.rt.map().backgroundImage);
    /**
     * Objetos do mapa. Durante um arraste do Mestre, as posições arrastadas
     * vêm da prévia local (`dragPreview`) — sem isso o objeto "pula pra trás"
     * quando um sync atrasado chega no meio do arraste.
     */
    readonly objects = computed(() => {
        const objects = this.rt.map().objects;
        const preview = this.dragPreview();
        if (!preview) return objects;
        return objects.map(o => preview.has(o.id) ? { ...o, ...preview.get(o.id) } : o);
    });
    private readonly dragPreview = signal<Map<string, { x: number; y: number }> | null>(null);

    /**
     * O que aparece no grid (e ilumina): o Mestre vê tudo; jogadores — e o Mestre
     * em "ver como jogador" — não veem os objetos ocultos (`MapObject.hidden`).
     */
    readonly visibleObjects = computed(() => {
        const objects = this.objects();
        const seesHidden = this.admin.isAdmin() && !this.previewAsPlayer();
        return seesHidden ? objects : objects.filter(o => !o.hidden);
    });
    /** 0 = nada visível, 100 = tudo visível. */
    readonly ambientLight = computed(() => this.rt.map().ambientLight);
    /** Efeitos de tela ativos — cumulativo, qualquer combinação pode estar ligada. */
    readonly effects = computed(() => this.rt.map().effects);
    /** Polígonos de visão — se algum estiver `enabled`, jogadores só veem a união deles. */
    readonly views = computed(() => this.rt.map().views);

    /** Mestre está no modo de desenhar/gerenciar views — local. */
    readonly viewEditMode = signal(false);
    /** Vértices do polígono em desenho agora (Ctrl+clique soma um) — local até concluir. */
    readonly drawingView = signal<MapViewPoint[]>([]);
    /**
     * Objetos selecionados no momento (grid + lista) — local.
     * `selectedObjectId` é o "principal" (o primeiro), usado por ações que só
     * fazem sentido pra um objeto por vez (girar lanterna, Ctrl+C/V, editor).
     */
    readonly selectedObjectIds = signal<string[]>([]);
    readonly selectedObjectId = computed(() => this.selectedObjectIds()[0] ?? null);
    /** Menu de edição de objeto aberto (botão direito no grid ou na lista) — local. */
    readonly contextMenu = signal<MapContextMenu | null>(null);
    /** Pulses ativos — chegam do servidor (`fx:pulse`) pra todo mundo e somem sozinhos. */
    readonly pulses = signal<MapPulse[]>([]);
    /** Mestre sempre vê o mapa 100% visível — isso liga a escuridão/views pra ele também. Local. */
    readonly previewAsPlayer = signal(false);

    /** Mensagem de erro do último import inválido, ou null se o último foi ok. */
    readonly importError = signal<string | null>(null);
    /** Erro do último comando recusado pelo servidor (ex.: sem conexão). */
    readonly persistError = this.rt.error.asReadonly();

    /** Último objeto copiado com Ctrl+C, pronto pra ser colado com Ctrl+V. */
    private clipboard: Omit<MapObject, 'id'> | null = null;

    constructor() {
        this.rt.on<PulseEvent>('fx:pulse', ({ x, y, name, color }) => this.addPulse(x, y, name, color));
    }

    setName(name: string): void {
        this.rt.send('map:setName', { name });
    }

    setAmbientLight(value: number): void {
        this.rt.send('map:setAmbientLight', { value });
    }

    toggleEffect(type: MapEffectType): void {
        this.rt.send('map:toggleEffect', { type });
    }

    async setBackgroundImage(file: File): Promise<void> {
        this.rt.send('map:setBackground', { image: await readAsDataUrl(file) });
    }

    addObject(partial: Partial<MapObject> = {}): MapObject {
        const object = createMapObject(partial);
        this.rt.send('map:addObject', { object });
        this.selectObject(object.id);
        return object;
    }

    updateObject(id: string, patch: Partial<MapObject>): void {
        this.rt.send('map:updateObject', { id, patch });
    }

    /** Mostra/oculta o objeto pros jogadores. */
    toggleHidden(id: string): void {
        const object = this.objects().find(o => o.id === id);
        if (object) this.updateObject(id, { hidden: !object.hidden });
    }

    /** Move vários objetos de uma vez (arraste em grupo) — um comando só. */
    moveObjects(moves: { id: string; x: number; y: number }[]): void {
        if (moves.length) this.rt.send('map:moveObjects', { moves });
    }

    /** Arraste em andamento: mostra as posições na hora e manda pro servidor. */
    dragTo(moves: { id: string; x: number; y: number }[]): void {
        this.dragPreview.set(new Map(moves.map(({ id, x, y }) => [id, { x, y }])));
        this.moveObjects(moves);
    }

    /** Jogador arrastando o token do PRÓPRIO personagem (o servidor confere dono e turno). */
    dragOwnTo(playerId: string, objectId: string, x: number, y: number): void {
        this.dragPreview.set(new Map([[objectId, { x, y }]]));
        this.rt.send('map:moveOwn', { playerId, objectId, x, y });
    }

    endDrag(): void {
        this.dragPreview.set(null);
    }

    removeObject(id: string): void {
        this.removeObjects([id]);
    }

    /** Remove todos os objetos selecionados no momento (Backspace/Delete). */
    removeSelected(): void {
        this.removeObjects(this.selectedObjectIds());
    }

    private removeObjects(ids: string[]): void {
        if (!ids.length) return;
        this.rt.send('map:removeObjects', { ids });
        this.selectedObjectIds.update(current => current.filter(id => !ids.includes(id)));
        const menu = this.contextMenu();
        if (menu && ids.includes(menu.objectId)) this.contextMenu.set(null);
    }

    /** Seleciona só esse objeto, ou soma/tira (`additive`) da seleção atual — Shift+clique/retângulo. */
    selectObject(id: string, options: { additive?: boolean } = {}): void {
        if (!options.additive) {
            this.selectedObjectIds.set([id]);
            return;
        }
        this.selectedObjectIds.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
    }

    /** Seleciona um grupo de objetos (retângulo de seleção), substituindo ou somando à seleção atual. */
    selectObjects(ids: string[], options: { additive?: boolean } = {}): void {
        if (!ids.length) return;
        if (!options.additive) {
            this.selectedObjectIds.set([...new Set(ids)]);
            return;
        }
        this.selectedObjectIds.update(current => [...new Set([...current, ...ids])]);
    }

    clearSelection(): void {
        if (this.selectedObjectIds().length) this.selectedObjectIds.set([]);
    }

    isSelected(id: string): boolean {
        return this.selectedObjectIds().includes(id);
    }

    /** Ping no mapa (botão do meio) — o servidor repassa pra todo mundo como `fx:pulse`. */
    ping(x: number, y: number, label?: string): void {
        this.rt.send('map:pulse', label === undefined ? { x, y } : { x, y, label });
    }

    /** Mostra um "pulse" numa célula do mundo por ~1.5s — só neste navegador. */
    addPulse(x: number, y: number, label?: string, color?: string): void {
        const pulse: MapPulse = { id: generateId('pulse'), x, y, label, color };
        this.pulses.update(list => [...list, pulse]);
        setTimeout(() => this.pulses.update(list => list.filter(p => p.id !== pulse.id)), 1500);
    }

    /** Liga o modo de edição de views, pronto pra começar um polígono novo. */
    startNewView(): void {
        this.viewEditMode.set(true);
        this.drawingView.set([]);
    }

    /** Sai do modo de edição — descarta qualquer polígono em desenho não concluído. */
    exitViewEditMode(): void {
        this.viewEditMode.set(false);
        this.drawingView.set([]);
    }

    /** Soma um vértice (já ancorado num canto do grid) ao polígono em desenho. */
    addViewPoint(point: MapViewPoint): void {
        if (!this.viewEditMode()) return;
        this.drawingView.update(points => [...points, point]);
    }

    /** Descarta o polígono em desenho, sem sair do modo de edição (pra tentar de novo). */
    cancelDrawingView(): void {
        this.drawingView.set([]);
    }

    /** Fecha o polígono em desenho (precisa de pelo menos 3 vértices) e já deixa pronto pro próximo. */
    finishDrawingView(label = ''): void {
        const points = this.drawingView();
        if (points.length < 3) return;
        const view: MapView = { id: generateId('view'), label, points, enabled: true };
        this.rt.send('map:addView', { view });
        this.drawingView.set([]);
    }

    updateView(id: string, patch: Partial<MapView>): void {
        this.rt.send('map:updateView', { id, patch });
    }

    toggleViewEnabled(id: string): void {
        const view = this.views().find(v => v.id === id);
        if (view) this.updateView(id, { enabled: !view.enabled });
    }

    removeView(id: string): void {
        this.rt.send('map:removeView', { id });
    }

    /** Aplica dano a um inimigo. Ao zerar o HP, o servidor joga o loot dele no chão e tira o objeto do mapa. */
    damageObject(id: string, amount: number): void {
        this.rt.send('map:damageObject', { id, amount });
    }

    async setObjectBackgroundImage(id: string, file: File): Promise<void> {
        this.updateObject(id, { backgroundImage: await readAsDataUrl(file) });
    }

    copyObject(id: string): void {
        const object = this.objects().find(o => o.id === id);
        if (!object) return;
        const { id: _drop, ...rest } = object;
        this.clipboard = rest;
    }

    /** Cola o último objeto copiado, deslocado 1 tile, já selecionado. Retorna null se não há nada copiado. */
    pasteClipboard(): MapObject | null {
        if (!this.clipboard) return null;
        return this.addObject({ ...this.clipboard, x: this.clipboard.x + 1, y: this.clipboard.y + 1 });
    }

    exportToJson(): string {
        return JSON.stringify(this.toFile(), null, 2);
    }

    downloadJson(): void {
        const blob = new Blob([this.exportToJson()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `piplontra-mapa-${slugify(this.name()) || 'sem-nome'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async importFromJson(file: File): Promise<void> {
        try {
            const parsed = JSON.parse(await readAsText(file));
            if (!isGameMapFile(parsed)) throw new Error('invalid shape');
            this.rt.send('map:replace', { map: parsed.map });
            this.selectedObjectIds.set([]);
            this.contextMenu.set(null);
            this.exitViewEditMode();
            this.importError.set(null);
        } catch {
            this.importError.set('Arquivo inválido.');
        }
    }

    private toFile(): GameMapFile {
        return { version: MAP_FILE_VERSION, map: this.rt.map() };
    }
}
