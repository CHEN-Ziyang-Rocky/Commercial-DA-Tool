import Redis from 'ioredis';
import { planDemoReviews } from '../src/modules/registry/demo-reviews';
import { importSnapshot } from '../src/modules/registry/import-snapshot';
import { snapshotHash } from '../src/modules/registry/validate-snapshot';
import { selectRecords } from '../src/modules/registry/registry.service';
import { AggregateService } from '../src/modules/registry/aggregate.service';
import { QueryCache } from '../src/modules/registry/query-cache';
import { replaceEntities } from '../src/modules/registry/structured';
import { randomUUID } from 'crypto';
/* Supertest exposes JSON bodies as any; assertions below validate the HTTP contract at runtime. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import {
  RegistryDataset,
  RegistryEntity,
  RegistryReview,
} from '../src/modules/registry/registry.entity';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AppDataSource } from '../src/config/typeorm.config';
import { configureApp } from '../src/common/configure-app';
import { UserService } from '../src/modules/user/user.service';

// This suite recreates only an explicitly opted-in test database and uses Redis DB 15.
describe('Entity governance HTTP integration', () => {
  let app: INestApplication;
  const originalEnv = { ...process.env };
  const testNamespace = 'test:' + randomUUID();
  let adminToken: string, memberToken: string, adminId: string;
  const password = 'TestPassword123!';
  it('serves authenticated registry filters, details and safe CSV', async () => {
    const db = app.get(DataSource);
    const lei = 'AAAAAAAAAAAAAAAAAAAA';
    const record = {
      lei,
      legalName: '=Example, Entity',
      otherNames: ['Former Test'],
      country: 'HK',
      city: 'Hong Kong',
      jurisdiction: 'HK',
      category: 'GENERAL',
      entityStatus: 'ACTIVE',
      registrationStatus: 'LAPSED',
      lastUpdate: '2026-01-01',
      nextRenewal: null,
      createdAt: null,
      groups: [lei],
      sourceUrl: 'https://api.gleif.org/api/v1/lei-records/' + lei,
      contextOnly: false,
      parents: {
        direct: { kind: 'exception' as const, sourceUrl: null, record: null },
        ultimate: {
          kind: 'unavailable' as const,
          sourceUrl: null,
          record: null,
        },
      },
    };
    await db.getRepository(RegistryEntity).save({
      lei,
      legalName: record.legalName,
      country: 'HK',
      city: record.city,
      registrationStatus: 'LAPSED',
      record,
    });
    await db.getRepository(RegistryDataset).save({
      id: 'current',
      metadata: {
        schemaVersion: 1,
        fetchedAt: new Date().toISOString(),
        source: 'GLEIF',
        license: 'CC0-1.0',
        scope: 'Test fixture',
        contentHash: 'a'.repeat(64),
        sourcePublishDates: [],
        coverage: [],
        seeds: [{ lei, label: 'Test', sector: 'Test' }],
      },
    });
    await request(app.getHttpServer()).get('/registry').expect(401);
    await request(app.getHttpServer()).get('/registry/company-options').expect(401);
    const options = await request(app.getHttpServer()).get('/registry/company-options')
      .auth(memberToken, {type:'bearer'}).expect(200);
    expect(options.body.items).toEqual(expect.arrayContaining([expect.objectContaining({lei, legalName:record.legalName})]));
    expect(options.body.total).toBe(options.body.items.length);
    const list = await request(app.getHttpServer())
      .get('/registry?country=HK&country=SG&q=former')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.metadata.changes?.entries).toBeUndefined();
    await request(app.getHttpServer()).get('/registry/changes').expect(401);
    const changes = await request(app.getHttpServer())
      .get('/registry/changes')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(changes.body).toHaveProperty('changes');
    expect(list.body.summary.review).toBe(1);
    await request(app.getHttpServer())
      .get('/registry?limit=999')
      .auth(memberToken, { type: 'bearer' })
      .expect(400);
    const detail = await request(app.getHttpServer())
      .get('/registry/' + lei)
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(detail.body.directParent).toBeNull();
    expect(detail.body.children).toEqual([]);
    const csv = await request(app.getHttpServer())
      .get('/registry/export?q=former')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(csv.text).toContain('"\'=Example, Entity"');
  });
  it('uses a real self relation, six filters, SQL aggregation and versioned Redis', async () => {
    const db = app.get(DataSource);
    const cache = app.get(QueryCache);
    const seed = (await db.getRepository(RegistryEntity).find())[0].record;
    const root = {
      ...seed,
      lei: 'RRRRRRRRRRRRRRRRRRRR',
      legalName: 'Root',
      registrationStatus: 'ISSUED',
      nextRenewal: '2099-01-01T00:00:00Z',
    };
    const child = {
      ...root,
      lei: 'CCCCCCCCCCCCCCCCCCCC',
      legalName: 'Child',
      parents: {
        ...root.parents,
        direct: {
          kind: 'relationship' as const,
          sourceUrl: null,
          record: {
            attributes: {
              relationship: {
                startNode: { id: 'CCCCCCCCCCCCCCCCCCCC' },
                endNode: { id: root.lei },
                type: 'IS_DIRECTLY_CONSOLIDATED_BY',
                status: 'ACTIVE',
              },
              registration: { status: 'PUBLISHED' },
            },
          },
        },
      },
    };
    const grand = {
      ...child,
      lei: 'GGGGGGGGGGGGGGGGGGGG',
      legalName: 'Grandchild',
      parents: {
        ...child.parents,
        direct: {
          ...child.parents.direct,
          record: {
            attributes: {
              relationship: {
                ...child.parents.direct.record.attributes.relationship,
                startNode: { id: 'GGGGGGGGGGGGGGGGGGGG' },
                endNode: { id: child.lei },
              },
              registration: { status: 'PUBLISHED' },
            },
          },
        },
      },
    };
    await db.transaction(async (m) => {
      await replaceEntities(m, [seed, root, child, grand]);
      await m.update(
        RegistryDataset,
        { id: 'current' },
        { version: randomUUID() },
      );
    });
    const relation = await db.getRepository(RegistryEntity).findOne({
      where: { lei: child.lei },
      relations: { directParent: true },
    });
    expect(relation?.directParent?.lei).toBe(root.lei);
    const old = process.env.CACHE_ENABLED;
    process.env.CACHE_ENABLED = 'true';
    process.env.CACHE_NAMESPACE = testNamespace;
    const path =
      '/registry/aggregate?root=' +
      root.lei +
      '&country=HK&city=Hong%20Kong&registrationStatus=ISSUED&entityStatus=ACTIVE&hierarchyLevel=2&hierarchyLevel=3';
    try {
      const a = await request(app.getHttpServer())
        .get(path)
        .auth(memberToken, { type: 'bearer' })
        .expect(200);
      expect(a.body.total).toBe(2);
      const sql = cache.status().sql;
      const b = await request(app.getHttpServer())
        .get(path)
        .auth(memberToken, { type: 'bearer' })
        .expect(200);
      expect(b.body).toEqual(a.body);
      expect(cache.status().sql).toBe(sql);
      expect(cache.status().hit).toBeGreaterThan(0);
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get('/registry/cache-status')
        .auth(memberToken, { type: 'bearer' })
        .expect(403);
      const list = await request(app.getHttpServer())
        .get(path.replace('/aggregate', '') + '&renewal=due-90')
        .auth(memberToken, { type: 'bearer' })
        .expect(200);
      expect(list.body.total).toBe(0);
      const list2 = await request(app.getHttpServer())
        .get(path.replace('/aggregate', ''))
        .auth(memberToken, { type: 'bearer' })
        .expect(200);
      expect(list2.body.total).toBe(a.body.total);
      // Each dimension, OR within a dimension, AND across dimensions, and adversarial text.
      for (const suffix of [
        '',
        'country=HK&country=SG',
        `portfolio=${root.lei}`,
        `portfolio=${child.lei}`,
        `portfolio=${root.lei}&portfolio=${child.lei}&portfolio=${root.lei}`,
        `portfolio=${root.lei}&portfolio=${child.lei}&country=HK`,
        `portfolio=${root.lei}&root=${child.lei}&hierarchyLevel=2`,
        'portfolio=ZZZZZZZZZZZZZZZZZZZZ',
        'country=SG',
        'city=Hong%20Kong',
        'city=hong%20kong',
        'city=%27%20OR%201%3D1--',
        'registrationStatus=LAPSED',
        'registrationStatus=LAPSED&registrationStatus=ISSUED',
        'entityStatus=INACTIVE',
        'status=ACTIVE',
        'renewal=unknown',
        'renewal=overdue',
        'renewal=due-30',
        'renewal=due-90',
        `root=${root.lei}`,
        `root=${root.lei}&hierarchyLevel=1`,
        `root=${root.lei}&hierarchyLevel=3`,
        `root=${child.lei}&hierarchyLevel=2`,
        'root=ZZZZZZZZZZZZZZZZZZZZ',
        `root=${root.lei}&hierarchyLevel=2&country=HK&city=Hong%20Kong&entityStatus=ACTIVE&registrationStatus=ISSUED&renewal=due-90`,
      ]) {
        const aggregate = await request(app.getHttpServer())
          .get('/registry/aggregate?' + suffix)
          .auth(memberToken, { type: 'bearer' })
          .expect(200);
        const matching = await request(app.getHttpServer())
          .get('/registry?' + suffix)
          .auth(memberToken, { type: 'bearer' })
          .expect(200);
        expect({ suffix, total: aggregate.body.total }).toEqual({
          suffix,
          total: matching.body.total,
        });
        const csv = await request(app.getHttpServer())
          .get('/registry/export?' + suffix)
          .auth(memberToken, { type: 'bearer' })
          .expect(200);
        expect(csv.text.split('\r\n').length - 1).toBe(matching.body.total);
      }
      for (const suffix of [
        'q=test',
        'quality=review',
        'workflow=reviewed',
        'entityStatus=ACTIVE&status=INACTIVE',
        'hierarchyLevel=4',
        'portfolio=bad',
        Array(11).fill(`portfolio=${root.lei}`).join('&'),
      ]) {
        await request(app.getHttpServer())
          .get('/registry/aggregate?' + suffix)
          .auth(memberToken, { type: 'bearer' })
          .expect(400);
      }
      const beforeVersionSQL = cache.status().sql;
      await db.transaction(async (m) => {
        await m.update(
          RegistryDataset,
          { id: 'current' },
          { version: randomUUID() },
        );
      });
      await request(app.getHttpServer())
        .get(path)
        .auth(memberToken, { type: 'bearer' })
        .expect(200);
      expect(cache.status().sql).toBe(beforeVersionSQL + 1);
      await request(app.getHttpServer())
        .get('/registry/aggregate?hierarchyLevel=2')
        .auth(memberToken, { type: 'bearer' })
        .expect(400);
    } finally {
      process.env.CACHE_ENABLED = old;
    }
  });
  it('preserves evidence, reviews and dataset version on replacement rollback', async () => {
    const db = app.get(DataSource);
    const original = await db.getRepository(RegistryEntity).find();
    const version = (
      await db.getRepository(RegistryDataset).findOneByOrFail({ id: 'current' })
    ).version;
    const first = original[0];
    await db.getRepository(RegistryReview).save({
      lei: first.lei,
      state: {
        version: 0,
        status: 'open',
        owner: 'Test',
        dueDate: '2099-01-01',
        note: 'Test only',
        recordHash: 'test',
        updatedAt: new Date().toISOString(),
        history: [],
      },
    });
    await expect(
      db.transaction(async (m) => {
        await replaceEntities(m, []);
        await m.update(
          RegistryDataset,
          { id: 'current' },
          { version: randomUUID() },
        );
        throw Error('Rollback');
      }),
    ).rejects.toThrow('Rollback');
    expect(await db.getRepository(RegistryEntity).count()).toBe(
      original.length,
    );
    expect(
      (
        await db
          .getRepository(RegistryDataset)
          .findOneByOrFail({ id: 'current' })
      ).version,
    ).toBe(version);
    await db.transaction((m) =>
      replaceEntities(
        m,
        original
          .filter((r) => r.lei !== 'RRRRRRRRRRRRRRRRRRRR')
          .map((r) => r.record),
      ),
    );
    const child = await db
      .getRepository(RegistryEntity)
      .findOneByOrFail({ lei: 'CCCCCCCCCCCCCCCCCCCC' });
    expect(child.directParentLei).toBeNull();
    expect(child.sourceDirectParentLei).toBe('RRRRRRRRRRRRRRRRRRRR');
    expect(await db.getRepository(RegistryReview).count()).toBeGreaterThan(0);
    await db.transaction((m) =>
      replaceEntities(
        m,
        original.map((r) => r.record),
      ),
    );
    await db.getRepository(RegistryReview).delete({ lei: first.lei });
  });
  it('reimports identical evidence with new versions and isolates overlapping readers', async () => {
    const db = app.get(DataSource);
    const dataset = await db
      .getRepository(RegistryDataset)
      .findOneByOrFail({ id: 'current' });
    const entities = (await db.getRepository(RegistryEntity).find()).map(
      ({ record }) => ({
        ...record,
        sourceUrl: 'https://api.gleif.org/api/v1/lei-records/' + record.lei,
      }),
    );
    const snapshot = {
      ...dataset.metadata,
      entities,
      contentHash: snapshotHash(entities),
    };
    await importSnapshot(db, snapshot);
    const first = await db
      .getRepository(RegistryDataset)
      .findOneByOrFail({ id: 'current' });
    await importSnapshot(db, snapshot);
    const second = await db
      .getRepository(RegistryDataset)
      .findOneByOrFail({ id: 'current' });
    expect(second.version).not.toBe(first.version);
    expect(second.metadata.contentHash).toBe(first.metadata.contentHash);
    const addition = structuredClone(snapshot);
    const fresh = {...addition.entities[0], lei: 'NNNNNNNNNNNNNNNNNNNN', legalName: 'New reference entity',
      groups: [], sourceUrl: 'https://api.gleif.org/api/v1/lei-records/NNNNNNNNNNNNNNNNNNNN',
      parents: {direct: {kind: 'unavailable' as const, sourceUrl: null, record: null}, ultimate: {kind: 'unavailable' as const, sourceUrl: null, record: null}}};
    addition.entities[0].legalName = 'Do not overwrite existing evidence';
    addition.entities.push(fresh);
    addition.contentHash = snapshotHash(addition.entities);
    const reviewsBefore = await db.getRepository(RegistryReview).count();
    await importSnapshot(db, addition, 'append');
    expect(await db.getRepository(RegistryEntity).count()).toBe(snapshot.entities.length + 1);
    expect((await db.getRepository(RegistryEntity).findOneByOrFail({lei:snapshot.entities[0].lei})).legalName).toBe(snapshot.entities[0].legalName);
    expect(await db.getRepository(RegistryReview).count()).toBe(reviewsBefore);
    await importSnapshot(db, snapshot);
    const runner = db.createQueryRunner();
    await runner.startTransaction('REPEATABLE READ');
    try {
      const pinned = await runner.manager.findOneByOrFail(RegistryDataset, {
        id: 'current',
      });
      const changed = structuredClone(snapshot);
      changed.fetchedAt = '2026-10-23T00:00:00Z';
      const child = changed.entities.find(
        (r) => r.lei === 'CCCCCCCCCCCCCCCCCCCC',
      );
      if (
        child.parents.direct.record &&
        !Array.isArray(child.parents.direct.record)
      ) {
        child.parents.direct.record.attributes.relationship.endNode.id =
          'AAAAAAAAAAAAAAAAAAAA';
      }
      changed.contentHash = snapshotHash(changed.entities);
      await importSnapshot(db, changed);
      const oldScope = app
        .get(AggregateService)
        .query(
          runner.manager,
          { root: 'RRRRRRRRRRRRRRRRRRRR', page: 1, limit: 20 },
          new Date(),
        ).qb;
      expect(await oldScope.getCount()).toBe(3);
      expect(
        (
          await runner.manager.findOneByOrFail(RegistryDataset, {
            id: 'current',
          })
        ).version,
      ).toBe(pinned.version);
      const newScope = await request(app.getHttpServer())
        .get('/registry/aggregate?root=RRRRRRRRRRRRRRRRRRRR')
        .auth(memberToken, { type: 'bearer' })
        .expect(200);
      expect(newScope.body.total).toBe(1);
      expect(newScope.body.version).not.toBe(pinned.version);
      const linked = await db
        .getRepository(RegistryEntity)
        .findOneByOrFail({ lei: child.lei });
      expect(linked.directParentLei).toBe('AAAAAAAAAAAAAAAAAAAA');
      expect(linked.sourceDirectParentLei).toBe(linked.directParentLei);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
      await importSnapshot(db, snapshot);
    }
  });
  it('matches SQL and memory at exact renewal timestamp boundaries', async () => {
    const db = app.get(DataSource);
    const original = (await db.getRepository(RegistryEntity).find()).map(
      (r) => r.record,
    );
    const now = new Date('2026-10-23T12:34:56.789Z');
    const offsets = [
      -1,
      0,
      30 * 86400000,
      30 * 86400000 + 1,
      90 * 86400000,
      90 * 86400000 + 1,
    ];
    const rows = offsets.map((offset, i) => ({
      ...original[0],
      lei: String(i).repeat(20),
      nextRenewal: new Date(now.getTime() + offset).toISOString(),
      parents: {
        direct: { kind: 'unavailable' as const, sourceUrl: null, record: null },
        ultimate: {
          kind: 'unavailable' as const,
          sourceUrl: null,
          record: null,
        },
      },
    }));
    try {
      await db.transaction((m) => replaceEntities(m, rows));
      for (const renewal of ['overdue', 'due-30', 'due-90', 'unknown']) {
        const result = await app
          .get(AggregateService)
          .query(db.manager, { renewal, page: 1, limit: 20 }, now)
          .qb.getMany();
        expect(result.map((r) => r.lei).sort()).toEqual(
          selectRecords(rows, { renewal, page: 1, limit: 20 }, now.getTime())
            .map((r) => r.lei)
            .sort(),
        );
      }
      const first = await db
        .getRepository(RegistryEntity)
        .findOneByOrFail({ lei: rows[0].lei });
      expect(first.nextRenewal?.toISOString()).toBe(rows[0].nextRenewal);
    } finally {
      await db.transaction((m) => replaceEntities(m, original));
    }
  });
  it('masks account list contacts without changing authorized editing values', async () => {
    const list = await request(app.getHttpServer())
      .get('/user')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    const row = (
      list.body.items as { id: string; email: string; passwordHash?: string }[]
    ).find((r: { id: string }) => r.id === adminId);
    expect(row?.email).toContain('***');
    expect(row?.passwordHash).toBeUndefined();
    const detail = await request(app.getHttpServer())
      .get('/user/' + adminId)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(detail.body.email).not.toContain('***');
    expect(detail.body.passwordHash).toBeUndefined();
  });
  it('reports database readiness without authentication', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
  it('blocks registration when public registration is disabled', async () => {
    process.env.ALLOW_REGISTRATION = 'false';
    try {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Blocked',
          email: 'blocked@test.example',
          password,
        })
        .expect(403);
    } finally {
      process.env.ALLOW_REGISTRATION = 'true';
    }
  });
  it('seeds labeled review examples idempotently, preserves existing reviews, and re-checks stale evidence through the normal API', async () => {
    const db = app.get(DataSource);
    const base = (await db.getRepository(RegistryEntity).find())[0].record;
    const records = Array.from({ length: 5 }, (_, i) => ({ ...base, lei: 'DEMO' + String(i).padStart(16, '0'), legalName: `Demo integration ${i}` }));
    try {
    for (const r of records) await db.getRepository(RegistryEntity).save({ lei: r.lei, legalName: r.legalName, country: r.country, city: r.city,
      registrationStatus: r.registrationStatus, entityStatus: r.entityStatus, nextRenewal: r.nextRenewal ? new Date(r.nextRenewal) : null, record: r });
    const before = await db.getRepository(RegistryReview).find();
    const planned = planDemoReviews(records, before);
    expect(planned).toHaveLength(4);
    await db.transaction(async (m) => { for (const r of planned) await m.insert(RegistryReview, r); });
    const after = await db.getRepository(RegistryReview).find();
    expect(planDemoReviews(records, after)).toEqual([]);
    for (const r of before) expect(after.find((a) => a.lei === r.lei)).toEqual(r);
    const all = await request(app.getHttpServer()).get('/registry?q=Demo%20integration').auth(memberToken, { type: 'bearer' }).expect(200);
    expect(all.body.overview.demoReviews).toBe(4);
    expect(all.body.summary.openReviews).toBe(2);
    expect(all.body.summary.overdueReviews).toBe(1);
    expect(all.body.summary.staleReviews).toBe(1);
    expect(all.body.summary.reviewed).toBe(1);
    expect(all.body.overview.renewalBuckets.reduce((n, r) => n + r.count, 0)).toBe(5);
    const csv = await request(app.getHttpServer()).get('/registry/export?q=Demo%20integration').auth(memberToken, { type: 'bearer' }).expect(200);
    expect(csv.text).not.toContain('Demonstration task');
    expect(csv.text).not.toContain('Demo task');
    expect(csv.text).not.toContain('Demo ·');
    const stale = planned.find((r) => r.state.demo.scenario === 'evidence_changed');
    const detail = await request(app.getHttpServer()).get('/registry/' + stale.lei).auth(adminToken, { type: 'bearer' }).expect(200);
    expect(detail.body.reviewStale).toBe(true);
    expect(detail.body.review.owner).not.toContain('Demo');
    expect(JSON.stringify(detail.body.review.history)).not.toMatch(/DEMO:|Demonstration/);
    await request(app.getHttpServer()).put('/registry/' + stale.lei + '/review').auth(adminToken, { type: 'bearer' }).send({
      version: 2, evidenceVersion: detail.body.evidenceVersion, status: 'reviewed', owner: stale.state.owner,
      dueDate: stale.state.dueDate, note: 'DEMO: Re-checked current evidence through the normal review workflow.',
    }).expect(200);
    const checked = await request(app.getHttpServer()).get('/registry/' + stale.lei).auth(memberToken, { type: 'bearer' }).expect(200);
    expect(checked.body.reviewStale).toBe(false);
    expect(checked.body.review.demo.scenario).toBe('evidence_changed');
    expect(checked.body.review.history).toHaveLength(3);
    } finally {
      await db.getRepository(RegistryReview).delete(records.map((r) => r.lei));
      await db.getRepository(RegistryEntity).delete(records.map((r) => r.lei));
    }
  });
  beforeAll(async () => {
    if (
      process.env.TEST_ALLOW_DB_RESET !== '1' ||
      !/^test_[a-z0-9_]+$/.test(process.env.DB_NAME ?? '') ||
      new URL(process.env.REDIS_URL ?? 'redis://localhost').pathname !== '/15'
    ) {
      throw new Error(
        'Use TEST_ALLOW_DB_RESET=1, DB_NAME=test_..., and an isolated REDIS_URL ending in /15. See README.',
      );
    }
    process.env.ALLOW_REGISTRATION = 'true';
    await AppDataSource.initialize();
    try {
      await AppDataSource.synchronize(true);
    } finally {
      await AppDataSource.destroy();
    }
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const users = app.get(UserService);
    const admin = await users.create({
      fullName: 'Admin',
      email: 'admin@test.example',
      password,
      role: 'admin',
    });
    adminId = admin.id;
    await users.create({
      fullName: 'Member',
      email: 'member@test.example',
      password,
      role: 'user',
    });
    adminToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password })
        .expect(201)
    ).body.access_token;
    memberToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'member@test.example', password })
        .expect(201)
    ).body.access_token;
  }, 30000);
  afterAll(async () => {
    if (app) await app.close();
    const redis = new Redis(process.env.REDIS_URL);
    try {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(
          cursor,
          'MATCH',
          `commercial-da:${testNamespace}:*`,
          'COUNT',
          100,
        );
        cursor = next;
        if (keys.length) await redis.unlink(...keys);
      } while (cursor !== '0');
    } finally {
      redis.disconnect();
      process.env = { ...originalEnv };
    }
  });
  const bearer = (token = memberToken) => `Bearer ${token}`;

  it('protects registry endpoints and rejects expired/tampered tokens', async () => {
    await request(app.getHttpServer()).get('/registry').expect(401);
    await request(app.getHttpServer()).get('/registry/company-options').expect(401);
    const options = await request(app.getHttpServer()).get('/registry/company-options')
      .auth(memberToken, {type:'bearer'}).expect(200);
    expect(options.body.items.length).toBeGreaterThan(0);
    expect(options.body.total).toBe(options.body.items.length);
    await request(app.getHttpServer())
      .get('/registry/AAAAAAAAAAAAAAAAAAAA')
      .expect(401);
    await request(app.getHttpServer())
      .put('/registry/AAAAAAAAAAAAAAAAAAAA/review')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .get('/registry')
      .set('Authorization', bearer(memberToken + 'bad'))
      .expect(401);
    const expired = app
      .get(JwtService)
      .sign({ sub: adminId }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/registry')
      .set('Authorization', bearer(expired))
      .expect(401);
  });
  it('validates login and registration; clients cannot register as admin', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'bad', password })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'member@test.example', password: 'WrongPassword' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'New user',
        email: 'new@test.example',
        password,
        role: 'admin',
      })
      .expect(400);
    const { body } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'New user', email: 'NEW@test.example', password })
      .expect(201);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', bearer(body.access_token))
      .expect(200);
    expect(me.body).toMatchObject({ email: 'new@test.example', role: 'user' });
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'New user', email: 'new@test.example', password })
      .expect(409);
  });
  it('rejects member access to all user management operations', async () => {
    await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', bearer())
      .expect(403);
    await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', bearer())
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/user/${adminId}`)
      .set('Authorization', bearer())
      .send({ role: 'admin' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/user/${adminId}`)
      .set('Authorization', bearer())
      .expect(403);
  });
  it('admin CRUD hashes passwords, hides hashes and invalidates deleted accounts', async () => {
    const created = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', bearer(adminToken))
      .send({
        fullName: 'Managed User',
        email: 'managed@test.example',
        password,
        role: 'user',
      })
      .expect(201);
    expect(created.body).not.toHaveProperty('passwordHash');
    const stored = await app
      .get(UserService)
      .findByEmail('managed@test.example', true);
    expect(stored.passwordHash).not.toBe(password);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'managed@test.example', password })
      .expect(201);
    const list = await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', bearer(adminToken))
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain('passwordHash');
    await request(app.getHttpServer())
      .patch(`/user/${created.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ password: null })
      .expect(400);
    const updated = await request(app.getHttpServer())
      .patch(`/user/${created.body.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ fullName: 'Renamed', password: 'ChangedPassword123!' })
      .expect(200);
    expect(updated.body).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'managed@test.example', password })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'managed@test.example', password: 'ChangedPassword123!' })
      .expect(201);
    const cacheMode = process.env.CACHE_ENABLED;
    process.env.CACHE_ENABLED = 'true';
    process.env.CACHE_NAMESPACE = testNamespace;
    await request(app.getHttpServer())
      .get('/registry/aggregate')
      .auth(login.body.access_token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/registry/aggregate')
      .auth(login.body.access_token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/user/${created.body.id}`)
      .set('Authorization', bearer(adminToken))
      .expect(200);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', bearer(login.body.access_token))
      .expect(401);
    await request(app.getHttpServer())
      .get('/registry/aggregate')
      .auth(login.body.access_token, { type: 'bearer' })
      .expect(401);
    process.env.CACHE_ENABLED = cacheMode;
  });
  it('reads current roles instead of trusting the signed role claim', async () => {
    const managed = await app.get(UserService).create({
      fullName: 'Other Admin',
      email: 'other@test.example',
      password,
      role: 'admin',
    });
    const token = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: managed.email, password })
    ).body.access_token;
    await request(app.getHttpServer())
      .patch(`/user/${managed.id}`)
      .set('Authorization', bearer(adminToken))
      .send({ role: 'user' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', bearer(token))
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/user/${adminId}`)
      .set('Authorization', bearer(adminToken))
      .send({ role: 'user' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/user/${adminId}`)
      .set('Authorization', bearer(adminToken))
      .expect(403);
  });

  it('restricts writes, validates dates, preserves audit and rejects lost updates', async () => {
    const path = '/registry/AAAAAAAAAAAAAAAAAAAA/review';
    const initialDetail = await request(app.getHttpServer())
      .get('/registry/AAAAAAAAAAAAAAAAAAAA')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    const dto = {
      evidenceVersion: initialDetail.body.evidenceVersion,
      version: 0,
      owner: 'Entity operations',
      dueDate: '2026-01-01',
      status: 'in_progress',
      note: 'Checked source record; follow up renewal with entity owner.',
    };
    await request(app.getHttpServer())
      .put(path)
      .auth(memberToken, { type: 'bearer' })
      .send(dto)
      .expect(403);
    await request(app.getHttpServer())
      .put(path)
      .auth(adminToken, { type: 'bearer' })
      .send({ ...dto, dueDate: '2026-02-30' })
      .expect(400);
    await request(app.getHttpServer())
      .put(path)
      .auth(adminToken, { type: 'bearer' })
      .send({ ...dto, note: ' ' })
      .expect(400);
    const saved = await request(app.getHttpServer())
      .put(path)
      .auth(adminToken, { type: 'bearer' })
      .send(dto)
      .expect(200);
    expect(saved.body.version).toBe(1);
    expect(saved.body.history[0].actor).toBe(adminId);
    const concurrent = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .put(path)
          .auth(adminToken, { type: 'bearer' })
          .send({ ...dto, version: 1, status: 'reviewed' }),
      ),
    );
    expect(concurrent.map((r) => r.status).sort()).toEqual([200, 409]);
    const detail = await request(app.getHttpServer())
      .get('/registry/AAAAAAAAAAAAAAAAAAAA')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(detail.body.review.history).toHaveLength(2);
    expect(detail.body.reviewStale).toBe(false);
    const reviewed = await request(app.getHttpServer())
      .get('/registry?workflow=reviewed')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(reviewed.body.total).toBe(1);
    expect(reviewed.body.items[0].review.owner).toBe('Entity operations');
    expect(reviewed.body.items[0].review).not.toHaveProperty('history');
    expect(reviewed.body.items[0].review).not.toHaveProperty('note');
    const db = app.get(DataSource);
    const entity = await db
      .getRepository(RegistryEntity)
      .findOneByOrFail({ lei: 'AAAAAAAAAAAAAAAAAAAA' });
    entity.record.legalName = 'Changed legal name';
    await db.getRepository(RegistryEntity).save(entity);
    const stale = await request(app.getHttpServer())
      .get('/registry?workflow=stale')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(stale.body.total).toBe(1);
    await request(app.getHttpServer())
      .put(path)
      .auth(adminToken, { type: 'bearer' })
      .send({ ...dto, version: 2 })
      .expect(409);
    expect(stale.body.summary.reviewed).toBe(0);
    const csv = await request(app.getHttpServer())
      .get('/registry/export?workflow=stale&limit=1')
      .auth(memberToken, { type: 'bearer' })
      .expect(200);
    expect(csv.text).toContain('Entity operations');
    expect(csv.text).toContain('Re-review required');
    await request(app.getHttpServer())
      .get('/company')
      .auth(adminToken, { type: 'bearer' })
      .expect(404);
  });
});
