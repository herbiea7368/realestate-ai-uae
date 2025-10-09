import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ListingWriterModule } from './listing-writer/listing-writer.module';
import { PermitsModule } from './permits/permits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:standard' },
              },
      },
    }),
    HealthModule,
    AuthModule,
    PermitsModule,
    ListingWriterModule,
  ],
})
export class AppModule {}
