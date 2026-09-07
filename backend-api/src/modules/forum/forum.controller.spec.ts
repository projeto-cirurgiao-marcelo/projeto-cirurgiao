import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';

describe('ForumController authorization', () => {
  let app: INestApplication;
  const service = {
    reportTopic: jest.fn().mockResolvedValue({ id: 'report-1' }),
    findAllReports: jest.fn().mockResolvedValue({ reports: [], total: 0 }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ForumController],
      providers: [{ provide: ForumService, useValue: service }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-test-role'];
          if (!role) throw new UnauthorizedException();
          req.user = { id: 'user-1', userId: 'user-1', role };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /forum/reports', () => {
    it('rejects unauthenticated requests before calling the service', async () => {
      await request(app.getHttpServer()).get('/forum/reports').expect(401);
      expect(service.findAllReports).not.toHaveBeenCalled();
    });

    it('rejects STUDENT with 403', async () => {
      await request(app.getHttpServer())
        .get('/forum/reports')
        .set('x-test-role', Role.STUDENT)
        .expect(403);
      expect(service.findAllReports).not.toHaveBeenCalled();
    });

    it('rejects INSTRUCTOR with 403', async () => {
      await request(app.getHttpServer())
        .get('/forum/reports')
        .set('x-test-role', Role.INSTRUCTOR)
        .expect(403);
      expect(service.findAllReports).not.toHaveBeenCalled();
    });

    it('allows ADMIN to list reports', async () => {
      await request(app.getHttpServer())
        .get('/forum/reports')
        .set('x-test-role', Role.ADMIN)
        .expect(200);
      expect(service.findAllReports).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /forum/reports', () => {
    it('allows authenticated STUDENT to report topic', async () => {
      await request(app.getHttpServer())
        .post('/forum/reports')
        .set('x-test-role', Role.STUDENT)
        .send({ topicId: 'topic-1', reason: 'SPAM' })
        .expect(201);
      expect(service.reportTopic).toHaveBeenCalledWith('user-1', {
        topicId: 'topic-1',
        reason: 'SPAM',
      });
    });
  });
});
