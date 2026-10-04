import { Body, Controller, Get, HttpCode, HttpStatus, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller('api/notifications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationpreferences: NotificationPreferencesService) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  async putApiNotificationsPreferences(@Req() req: Request, @Body() body: unknown) {
    return this.notificationpreferences.upsert(req.session!.userId, body);
  }

  @Get()
  async getApiNotificationsPreferences(@Req() req: Request) {
    return this.notificationpreferences.get(req.session!.userId);
  }
}
