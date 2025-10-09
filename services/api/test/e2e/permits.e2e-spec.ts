import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('Permits & Listing Writer E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );
    await app.init();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-001: POST /permits/check returns valid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/permits/check')
      .send({
        property_id: 'P-100',
        market: 'Dubai',
        trakheesi_number: '654321',
      })
      .expect(201);

    expect(response.body.status).toBe('valid');
    expect(response.body.errors).toHaveLength(0);
  });

  it('TC-002: POST /permits/check flags expired permits', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/permits/check')
      .send({
        property_id: 'P-200',
        market: 'Dubai',
        trakheesi_number: '123456',
      })
      .expect(201);

    expect(response.body.status).toBe('expired');
    expect(response.body.errors).toContain('permit_expired');
  });

  it('blocks listing writer drafts when permit invalid', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/listing-writer')
      .send({
        property_id: 'P-300',
        market: 'Dubai',
        trakheesi_number: '123456',
        language: 'en',
      })
      .expect(409);
  });

  it('returns deterministic draft when permit valid', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/listing-writer')
      .send({
        property_id: 'P-300',
        market: 'Dubai',
        trakheesi_number: '654321',
        language: 'en',
      })
      .expect(201);

    expect(response.body.description).toContain('Trakheesi 654321');
    expect(response.body.toxicity_flag).toBe(false);
    expect(response.body.compliance.canPublish).toBe(true);
  });
});
