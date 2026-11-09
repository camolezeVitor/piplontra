import { DynamicModule, Module } from '@nestjs/common';
import { Db } from './db';
import { GameGateway } from './game.gateway';

@Module({})
export class AppModule {
    static with(db: Db): DynamicModule {
        return { module: AppModule, providers: [{ provide: Db, useValue: db }, GameGateway] };
    }
}
