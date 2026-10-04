import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';
import { PrismaService } from '../../prisma/prisma.service';

function fakePrisma() {
  const orders: any[] = [];
  return {
    orders,
    customer: { findUnique: jest.fn(async ({ where }: any) => (where.userId === 'cust-user' ? { id: 'cust-1', userId: 'cust-user' } : null)) },
    vendorProfile: { findUnique: jest.fn(async ({ where }: any) => (where.userId === 'vend-user' ? { id: 'vendor-1', userId: 'vend-user' } : null)) },
    order: {
      create: jest.fn(async ({ data }: any) => {
        const o = { id: `o${orders.length + 1}`, status: data.status, customerId: data.customerId, vendorId: data.vendorId };
        orders.push(o);
        return o;
      }),
      findUnique: jest.fn(async ({ where }: any) => orders.find(o => o.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const o = orders.find(x => x.id === where.id);
        Object.assign(o, data);
        return o;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        orders.filter(o => (where.customerId ? o.customerId === where.customerId : where.vendorId.in.includes(o.vendorId)))),
    },
    orderItem: {},
  };
}

describe('OrderManagementController', () => {
  let prisma: ReturnType<typeof fakePrisma>;
  let controller: OrderManagementController;
  const customerReq = { session: { userId: 'cust-user', role: 'CUSTOMER', firmId: null } } as any;
  const vendorReq = { session: { userId: 'vend-user', role: 'VENDOR', firmId: null } } as any;

  beforeEach(() => {
    prisma = fakePrisma();
    controller = new OrderManagementController(new OrderManagementService(prisma as unknown as PrismaService));
  });

  it('is mounted at /api/orders', () => {
    expect(Reflect.getMetadata('path', OrderManagementController)).toBe('api/orders');
  });

  it('customer creates a pending order', async () => {
    const res = await controller.postApiOrders(customerReq, {
      vendorId: 'vendor-1',
      items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }],
    });
    expect(res).toMatchObject({ status: 'pending', customerId: 'cust-1' });
    expect(prisma.order.create.mock.calls[0][0].data.orderItems.create).toHaveLength(1);
  });

  it('vendor confirms a pending order and customer sees it confirmed', async () => {
    const created = await controller.postApiOrders(customerReq, { vendorId: 'vendor-1', items: [] });
    const confirmed = await controller.patchApiOrdersIdConfirm(vendorReq, created.id, { estimatedDelivery: '2026-11-01' });
    expect(confirmed).toMatchObject({ id: created.id, status: 'confirmed' });
    const list = await controller.getApiOrders(customerReq);
    expect(list).toEqual([expect.objectContaining({ id: created.id, status: 'confirmed' })]);
  });

  it('rejects confirm without a valid date', async () => {
    const created = await controller.postApiOrders(customerReq, { vendorId: 'vendor-1' });
    await expect(controller.patchApiOrdersIdConfirm(vendorReq, created.id, { estimatedDelivery: 'nope' })).rejects.toThrow();
  });
});
