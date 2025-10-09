import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

async function run() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  await app.listen(0);

  const server = app.getHttpServer();
  const failures: string[] = [];

  try {
    const valid = await request(server)
      .post('/api/v1/permits/check')
      .send({
        property_id: 'P-100',
        market: 'Dubai',
        trakheesi_number: '654321',
      });
    if (valid.status !== 201 || valid.body.status !== 'valid') {
      failures.push('TC-001 failed');
    }

    const expired = await request(server)
      .post('/api/v1/permits/check')
      .send({
        property_id: 'P-200',
        market: 'Dubai',
        trakheesi_number: '123456',
      });
    if (
      expired.status !== 201 ||
      expired.body.status !== 'expired' ||
      !expired.body.errors?.includes('permit_expired')
    ) {
      failures.push('TC-002 failed');
    }

    const blocked = await request(server)
      .post('/api/v1/listing-writer')
      .send({
        property_id: 'P-300',
        market: 'Dubai',
        trakheesi_number: '123456',
        language: 'en',
      });
    if (blocked.status !== 409) {
      failures.push('Listing writer should block invalid permit');
    }

    const allowed = await request(server)
      .post('/api/v1/listing-writer')
      .send({
        property_id: 'P-301',
        market: 'Dubai',
        trakheesi_number: '654321',
        language: 'en',
      });
    if (
      allowed.status !== 201 ||
      !allowed.body.description?.includes('Trakheesi 654321') ||
      allowed.body.toxicity_flag !== false
    ) {
      failures.push('Listing writer valid path failed');
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    failures.push(`Unexpected error: ${message}`);
  } finally {
    await app.close();
  }

  if (failures.length) {
    failures.forEach((f) => console.error(f));
    process.exitCode = 1;
  } else {
    console.log('E2E suite passed (TC-001, TC-002, listing writer guards)');
  }
}

run();
