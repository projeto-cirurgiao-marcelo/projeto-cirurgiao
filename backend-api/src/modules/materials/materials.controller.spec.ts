import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

describe('MaterialsController authorization', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
    findAllByVideo: jest.fn(),
    findOne: jest.fn(),
  };
  const basePath = '/videos/video-1/materials';
  const mutations = [
    {
      name: 'create' as const,
      method: 'post' as const,
      path: basePath,
      body: { title: 'Material', type: 'LINK', url: 'https://example.com' },
      args: ['video-1', { title: 'Material', type: 'LINK', url: 'https://example.com' }],
      status: 201,
    },
    {
      name: 'update' as const,
      method: 'patch' as const,
      path: `${basePath}/material-1`,
      body: { title: 'Updated material' },
      args: ['material-1', { title: 'Updated material' }],
      status: 200,
    },
    {
      name: 'remove' as const,
      method: 'delete' as const,
      path: `${basePath}/material-1`,
      body: {},
      args: ['material-1'],
      status: 204,
    },
    {
      name: 'reorder' as const,
      method: 'post' as const,
      path: `${basePath}/reorder`,
      body: { materialIds: ['material-2', 'material-1'] },
      args: ['video-1', ['material-2', 'material-1']],
      // Preserve Nest's existing POST status; authorization is the only change.
      status: 201,
    },
  ];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [{ provide: MaterialsService, useValue: service }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({
        // Simulate authenticated identities without Firebase or database access.
        // RolesGuard is deliberately not mocked.
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-test-role'];
          if (!role) throw new UnauthorizedException();
          req.user = { id: 'user-1', role };
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

  describe.each(mutations)('$name', ({ name, method, path, body, args, status }) => {
    it('rejects unauthenticated requests before calling the service', async () => {
      await request(app.getHttpServer())[method](path).send(body).expect(401);
      expect(service[name]).not.toHaveBeenCalled();
    });

    it('rejects STUDENT before calling the service', async () => {
      await request(app.getHttpServer())[method](path)
        .set('x-test-role', Role.STUDENT)
        .send(body)
        .expect(403);
      expect(service[name]).not.toHaveBeenCalled();
    });

    it.each([Role.ADMIN, Role.INSTRUCTOR])('allows %s', async (role) => {
      await request(app.getHttpServer())[method](path)
        .set('x-test-role', role)
        .send(body)
        .expect(status);
      expect(service[name]).toHaveBeenCalledTimes(1);
      expect(service[name]).toHaveBeenCalledWith(...args);
    });
  });

  it.each([basePath, `${basePath}/material-1`])(
    'preserves public read access to %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(200);
    },
  );
});
