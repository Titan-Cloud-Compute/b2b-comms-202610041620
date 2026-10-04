import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { OrderActor, OrderManagementService } from './order-management.service';
import type { PatchApiOrdersIdConfirmRequestDto, PostApiOrdersRequestDto } from './order-management.dto';

function actorOf(req: Request): OrderActor {
  if (!req.session) throw new UnauthorizedException('not authenticated');
  return { userId: req.session.userId, role: req.session.role };
}

@ApiTags('order-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.VENDOR)
@Controller('api/orders')
export class OrderManagementController {
  constructor(private readonly ordermanagement: OrderManagementService) {}

  @Post('')
  @HttpCode(201)
  @Roles(UserRole.CUSTOMER)
  async postApiOrders(@Req() req: Request, @Body() body: PostApiOrdersRequestDto) {
    return this.ordermanagement.create(actorOf(req), body);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.VENDOR)
  async patchApiOrdersIdConfirm(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: PatchApiOrdersIdConfirmRequestDto,
  ) {
    return this.ordermanagement.confirm(actorOf(req), id, body?.estimatedDelivery);
  }

  @Get('')
  async getApiOrders(@Req() req: Request) {
    return this.ordermanagement.list(actorOf(req));
  }
}
