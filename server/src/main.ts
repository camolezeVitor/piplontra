import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { Db } from './db';

export interface AppOptions {
    dataDir: string;
    masters: string[];
    port: number;
    /** Build do Angular servido em `/` (opcional — no dev o `ng serve` cuida disso). */
    webDir?: string;
}

export async function createApp(options: AppOptions): Promise<NestExpressApplication> {
    const db = new Db({ dir: options.dataDir, masters: options.masters });
    db.load();

    const app = await NestFactory.create<NestExpressApplication>(AppModule.with(db), { logger: ['error', 'warn'] });
    app.useStaticAssets(db.uploadsDir, { prefix: '/uploads' });
    if (options.webDir && existsSync(options.webDir)) app.useStaticAssets(options.webDir);
    app.enableShutdownHooks();

    await app.listen(options.port, '0.0.0.0');
    return app;
}

if (require.main === module) {
    const port = Number(process.env['PORT'] ?? 3000);
    createApp({
        port,
        dataDir: process.env['DATA_DIR'] ?? join(__dirname, '..', 'data'),
        masters: (process.env['MASTER_USERNAMES'] ?? '').split(','),
        webDir: join(__dirname, '..', '..', 'dist', 'piplontra', 'browser'),
    }).then(() => console.log(`Piplontra no ar: http://localhost:${port}`));
}
