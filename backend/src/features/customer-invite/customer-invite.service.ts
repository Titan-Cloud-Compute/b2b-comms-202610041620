import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiAdminCustomersResponseDto,
  PostApiAdminCustomersInviteResponseDto,
} from './customer-invite.dto';

@Injectable()
export class CustomerInviteService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Customer', 'User'] as const);
  }

  async invite(rawEmail: string): Promise<PostApiAdminCustomersInviteResponseDto> {
    const email = rawEmail.trim().toLowerCase();
    const existing = await this.model('Customer').findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('customer already exists');
    }
    let user = await this.model('User').findUnique({ where: { email } });
    if (!user) {
      user = await this.model('User').create({ data: { email, role: UserRole.CUSTOMER } });
    }
    const byUser = await this.model('Customer').findUnique({ where: { userId: user.id } });
    if (byUser) {
      throw new ConflictException('customer already exists');
    }
    const customer = await this.model('Customer').create({
      data: { email, userId: user.id },
    });
    return { customerId: customer.id, email: customer.email, invitationSent: true };
  }

  async list(): Promise<GetApiAdminCustomersResponseDto[]> {
    return this.model('Customer').findMany({
      select: { id: true, email: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
