import { NotificationPreferencesService } from './notification-preferences.service';

function makeService() {
  const rows = new Map<string, { id: string; userId: string; orderAlerts: boolean; messageAlerts: boolean }>();
  const delegate = {
    findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => rows.get(where.userId) ?? null),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const existing = rows.get(where.userId);
      const row = existing ? { ...existing, ...update } : { id: 'p1', ...create };
      rows.set(where.userId, row);
      return row;
    }),
  };
  const prisma = { notificationPreference: delegate } as any;
  return new NotificationPreferencesService(prisma);
}

describe('NotificationPreferencesService', () => {
  it('stores and returns order/message alert preferences', async () => {
    const svc = makeService();
    const res = await svc.upsert('u1', { orderAlerts: true, messageAlerts: false });
    expect(res).toEqual({ userId: 'u1', orderAlerts: true, messageAlerts: false });
    expect(await svc.get('u1')).toEqual(res);
  });

  it('stores both alert fields as false', async () => {
    const svc = makeService();
    await svc.upsert('u1', { orderAlerts: true, messageAlerts: true });
    const res = await svc.upsert('u1', { orderAlerts: false, messageAlerts: false });
    expect(res).toEqual({ userId: 'u1', orderAlerts: false, messageAlerts: false });
  });

  it('rejects non-boolean fields', async () => {
    const svc = makeService();
    await expect(svc.upsert('u1', { orderAlerts: 'yes' })).rejects.toThrow();
  });
});
