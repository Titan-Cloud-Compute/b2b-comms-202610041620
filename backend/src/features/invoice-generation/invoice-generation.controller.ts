import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { InvoiceGenerationService } from './invoice-generation.service';
import {
  GetApiInvoicesIdDownloadResponseDto,
  PostApiInvoicesRequestDto,
  PostApiInvoicesResponseDto,
} from './invoice-generation.dto';

@ApiTags('invoice-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/invoices')
export class InvoiceGenerationController {
  constructor(private readonly invoicegeneration: InvoiceGenerationService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async postApiInvoices(
    @Body() body: PostApiInvoicesRequestDto,
  ): Promise<PostApiInvoicesResponseDto> {
    const orderId = body?.orderId;
    const amount = Number(body?.amount);
    if (typeof orderId !== 'string' || orderId.trim() === '') {
      throw new BadRequestException('orderId is required');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    return this.invoicegeneration.create(orderId.trim(), amount);
  }

  @Get(':id/download')
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER, UserRole.ADMIN)
  async getApiInvoicesIdDownload(
    @Param('id') id: string,
  ): Promise<GetApiInvoicesIdDownloadResponseDto> {
    return this.invoicegeneration.getDownload(id);
  }
}
