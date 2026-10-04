import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AdminAuditController } from './admin-audit.controller';
import { AuditLogController } from '../features/audit-log/audit-log.controller';

const join = (...parts: string[]) =>
  '/' + parts.map(p => p.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');

function routes(ctrl: any): string[] {
  const base: string = Reflect.getMetadata(PATH_METADATA, ctrl) ?? '';
  return Object.getOwnPropertyNames(ctrl.prototype)
    .map(k => ctrl.prototype[k])
    .filter(fn => typeof fn === 'function' && Reflect.getMetadata(METHOD_METADATA, fn) !== undefined)
    .map(fn => `${RequestMethod[Reflect.getMetadata(METHOD_METADATA, fn)]} ${join(base, Reflect.getMetadata(PATH_METADATA, fn) ?? '')}`);
}

describe('admin audit route ownership', () => {
  it('platform AdminAuditController no longer claims GET /api/admin/audit-log', () => {
    expect(routes(AdminAuditController)).not.toContain('GET /api/admin/audit-log');
    expect(routes(AdminAuditController)).toContain('GET /api/admin/audit-trail');
  });

  it('feature AuditLogController owns GET and POST /api/admin/audit-log', () => {
    const r = routes(AuditLogController);
    expect(r).toContain('GET /api/admin/audit-log');
    expect(r).toContain('POST /api/admin/audit-log');
  });
});
