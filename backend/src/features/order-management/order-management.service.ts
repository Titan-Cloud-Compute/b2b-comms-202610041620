import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetApiOrdersResponseDto,
  PatchApiOrdersIdConfirmResponseDto,
  PostApiOrdersRequestDto,
  PostApiOrdersResponseDto,
} from './order-management.dto';

export interface OrderActor {
  userId: string;
  role: string;
}

@Injectable()
export class OrderManagementService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Order', 'OrderItem', 'Customer', 'VendorProfile'] as const);
  }

  /** Resolve the vendor ids that identify this vendor user (profile id and user id). */
  private async vendorIds(userId: string): Promise<string[]> {
    const profile = await this.model('VendorProfile').findUnique({ where: { userId } });
    return profile ? [profile.id, userId] : [userId];
  }

  async create(actor: OrderActor, body: PostApiOrdersRequestDto): Promise<PostApiOrdersResponseDto> {
    if (!body || typeof body.vendorId !== 'string' || !body.vendorId.trim()) {
      throw new BadRequestException('vendorId is required');
    }
    const items = Array.isArray(body.items) ? body.items : [];
    for (const it of items) {
      if (!it || typeof it.description !== 'string' || !it.description.trim()) {
        throw new BadRequestException('each item needs a description');
      }
      if (!Number.isInteger(Number(it.quantity)) || Number(it.quantity) <= 0) {
        throw new BadRequestException('item quantity must be a positive integer');
      }
      if (!Number.isFinite(Number(it.unitPrice)) || Number(it.unitPrice) < 0) {
        throw new BadRequestException('item unitPrice must be a non-negative number');
      }
    }
    const customer = await this.model('Customer').findUnique({ where: { userId: actor.userId } });
    if (!customer) throw new ForbiddenException('only customers can place orders');

    const order = await this.model('Order').create({
      data: {
        status: 'pending',
        customerId: customer.id,
        vendorId: body.vendorId.trim(),
        orderItems: {
          create: items.map(it => ({
            description: it.description.trim(),
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        },
      },
    });
    return { id: order.id, status: order.status, customerId: order.customerId, vendorId: order.vendorId };
  }

  async confirm(actor: OrderActor, id: string, estimatedDelivery: string): Promise<PatchApiOrdersIdConfirmResponseDto> {
    if (!estimatedDelivery || Number.isNaN(Date.parse(estimatedDelivery))) {
      throw new BadRequestException('estimatedDelivery must be a valid date');
    }
    const order = await this.model('Order').findUnique({ where: { id } });
    if (!order) throw new NotFoundException('order not found');
    const ids = await this.vendorIds(actor.userId);
    if (!ids.includes(order.vendorId)) throw new ForbiddenException('not your order');
    if (order.status !== 'pending') throw new BadRequestException('only pending orders can be confirmed');
    const updated = await this.model('Order').update({ where: { id }, data: { status: 'confirmed' } });
    return { id: updated.id, status: updated.status, estimatedDelivery };
  }

  async list(actor: OrderActor): Promise<GetApiOrdersResponseDto[]> {
    let where: { customerId?: string; vendorId?: { in: string[] } } | undefined;
    if (actor.role === 'VENDOR') {
      where = { vendorId: { in: await this.vendorIds(actor.userId) } };
    } else {
      const customer = await this.model('Customer').findUnique({ where: { userId: actor.userId } });
      if (!customer) return [];
      where = { customerId: customer.id };
    }
    const orders = await this.model('Order').findMany({ where, orderBy: { createdAt: 'desc' } });
    return orders.map(o => ({ id: o.id, status: o.status, customerId: o.customerId, vendorId: o.vendorId }));
  }
}
