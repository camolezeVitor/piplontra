/** Cola entre o socket e as regras: login no handshake, um evento `cmd`, broadcast das coleções. */
import { OnApplicationShutdown } from '@nestjs/common';
import {
    ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { authenticate } from './auth';
import { Ack, SyncKey, execute } from './commands';
import { Db } from './db';
import { extractDataUrls } from './images';
import { State, toPublic } from './models';

/** 50 MB: um import de mapa antigo ainda chega com as imagens em base64. */
@WebSocketGateway({ maxHttpBufferSize: 50e6 })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnApplicationShutdown {
    @WebSocketServer() io!: Server;

    constructor(private readonly db: Db) {}

    afterInit(io: Server): void {
        io.use((socket, next) => {
            try {
                const { user, created } = authenticate(this.db.state, socket.handshake.auth, this.db.masters);
                socket.data.user = user;
                socket.data.created = created;
                next();
            } catch (e) {
                next(e as Error);
            }
        });
    }

    handleConnection(socket: Socket): void {
        if (socket.data.created) {
            this.db.touch();
            this.sync(['users']);
        }
        socket.emit('state:snapshot', { me: toPublic(socket.data.user), ...this.publicState() });
    }

    @SubscribeMessage('cmd')
    onCmd(@ConnectedSocket() socket: Socket, @MessageBody() body: { type: string; payload?: unknown }): Ack {
        const payload = extractDataUrls(body?.payload ?? {}, this.db.uploadsDir);
        const { ack, sync, fx } = execute(this.db.state, socket.data.user, body?.type, payload);
        if (sync.length) {
            this.db.touch();
            this.sync(sync);
        }
        if (fx) this.io.emit(fx.event, fx.data);
        return ack;
    }

    onApplicationShutdown(): void {
        this.db.close();
    }

    private sync(keys: SyncKey[]): void {
        const state = this.publicState();
        for (const key of keys) this.io.emit(`sync:${key}`, state[key]);
    }

    private publicState(): Omit<State, 'version'> {
        const { version: _version, users, ...rest } = this.db.state;
        return { ...rest, users: users.map(toPublic) as State['users'] };
    }
}
