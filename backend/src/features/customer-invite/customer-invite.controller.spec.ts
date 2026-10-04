import { ConflictException } from '@nestjs/common';
import { CustomerInviteController } from './customer-invite.controller';
import { CustomerInviteService } from './customer-invite.service';

function makePrisma() {
  const users: any[] = [];
  const customers: any[] = [];
  let seq = 0;
  const match = (rows: any[], where: any) =>
    rows.find(r => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null;
  return {
    user: {
      findUnique: jest.fn(async ({ where }: any) => match(users, where)),
      create: jest.fn(async ({ data }: any) => {
        const u = { id: `u${++seq}`, ...data };
        users.push(u);
        return u;
      }),
    },
    customer: {
      findUnique: jest.fn(async ({ where }: any) => match(customers, where)),
      create: jest.fn(async ({ data }: any) => {
        const c = { id: `c${++seq}`, createdAt: new Date(), ...data };
        customers.push(c);
        return c;
      }),
      findMany: jest.fn(async () => customers.map(c => ({ id: c.id, email: c.email }))),
    },
  };
}

describe('CustomerInviteController', () => {
  let controller: CustomerInviteController;

  beforeEach(() => {
    const service = new CustomerInviteService(makePrisma() as any);
    controller = new CustomerInviteController(service);
  });

  it('invites a customer and returns invitationSent true', async () => {
    const res = await controller.postApiAdminCustomersInvite({ email: 'buyer@corp.example.com' });
    expect(res).toEqual({ customerId: expect.any(String), email: 'buyer@corp.example.com', invitationSent: true });
    const list = await controller.getApiAdminCustomers();
    expect(list).toEqual([{ id: res.customerId, email: 'buyer@corp.example.com' }]);
  });

  it('rejects a duplicate invite with 409', async () => {
    await controller.postApiAdminCustomersInvite({ email: 'dup@corp.example.com' });
    await expect(
      controller.postApiAdminCustomersInvite({ email: 'dup@corp.example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
