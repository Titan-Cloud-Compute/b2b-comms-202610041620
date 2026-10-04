import 'reflect-metadata';
import { BadRequestException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

function makePrisma() {
  const rows: any[] = [];
  let seq = 0;
  let clock = Date.parse('2026-01-01T00:00:00Z');
  return {
    auditEntry: {
      create: jest.fn(async ({ data }: any) => {
        clock += 1000;
        const r = { id: `e${++seq}`, createdAt: new Date(clock), updatedAt: new Date(clock), ...data };
        rows.push(r);
        return r;
      }),
      findMany: jest.fn(async ({ orderBy }: any) => {
        const dir = orderBy?.createdAt === 'desc' ? -1 : 1;
        return [...rows].sort((a, b) => dir * (a.createdAt.getTime() - b.createdAt.getTime()));
      }),
    },
  };
}

describe('AuditLogController', () => {
  let controller: AuditLogController;

  beforeEach(() => {
    controller = new AuditLogController(new AuditLogService(makePrisma() as any));
  });

  it('is mounted at api/admin/audit-log with bare GET and POST handlers', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditLogController)).toBe('api/admin/audit-log');
    const proto = AuditLogController.prototype;
    expect(Reflect.getMetadata(PATH_METADATA, proto.getApiAdminAuditLog)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.getApiAdminAuditLog)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, proto.postApiAdminAuditLog)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.postApiAdminAuditLog)).toBe(RequestMethod.POST);
  });

  it('stores an entry and returns the created record', async () => {
    const created = await controller.postApiAdminAuditLog({ action: 'login', userId: 'u1' });
    expect(created).toEqual({ id: expect.any(String), action: 'login', userId: 'u1', createdAt: expect.any(String) });
  });

  it('lists entries in chronological order', async () => {
    await controller.postApiAdminAuditLog({ action: 'first', userId: 'u1' });
    await controller.postApiAdminAuditLog({ action: 'second', userId: 'u2' });
    const list = await controller.getApiAdminAuditLog();
    expect(list.map(e => e.action)).toEqual(['first', 'second']);
  });

  it('rejects a missing action or userId with 400', async () => {
    await expect(controller.postApiAdminAuditLog({ action: '', userId: 'u1' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.postApiAdminAuditLog({ action: 'x' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
