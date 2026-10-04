import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiInvoicesIdDownloadResponseDto,
  PostApiInvoicesResponseDto,
} from './invoice-generation.dto';

@Injectable()
export class InvoiceGenerationService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Invoice', 'Order'] as const);
  }

  async create(orderId: string, amount: number): Promise<PostApiInvoicesResponseDto> {
    const order = await this.model('Order').findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (String(order.status).toLowerCase() !== 'confirmed') {
      throw new BadRequestException('order is not confirmed');
    }
    const invoice = await this.model('Invoice').upsert({
      where: { orderId },
      create: { orderId, amount },
      update: { amount },
    });
    return { id: invoice.id, orderId: invoice.orderId, amount: invoice.amount };
  }

  async getDownload(id: string): Promise<GetApiInvoicesIdDownloadResponseDto> {
    const invoice = await this.model('Invoice').findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('invoice not found');
    return { id: invoice.id, downloadUrl: `/api/invoices/${invoice.id}/file` };
  }
}
