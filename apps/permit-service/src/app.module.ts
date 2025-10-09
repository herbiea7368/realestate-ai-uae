import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { HealthModule } from './health/health.module';
import { PermitModule } from './permit/permit.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              },
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    SharedModule,
    HealthModule,
    PermitModule,
  ],
})
export class AppModule {}
