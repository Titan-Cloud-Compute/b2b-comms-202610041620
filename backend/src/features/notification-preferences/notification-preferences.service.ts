import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiNotificationsPreferencesResponseDto,
  PutApiNotificationsPreferencesRequestDto,
  PutApiNotificationsPreferencesResponseDto,
} from './notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['NotificationPreference']);
  }

  /** Return the caller's stored preferences, defaulting to all alerts on. */
  async get(userId: string): Promise<GetApiNotificationsPreferencesResponseDto> {
    const pref = await this.model('NotificationPreference').findUnique({ where: { userId } });
    if (!pref) return { userId, orderAlerts: true, messageAlerts: true };
    return { userId: pref.userId, orderAlerts: pref.orderAlerts, messageAlerts: pref.messageAlerts };
  }

  /** Upsert the caller's NotificationPreference row. */
  async upsert(userId: string, body: unknown): Promise<PutApiNotificationsPreferencesResponseDto> {
    const b = (body ?? {}) as Partial<PutApiNotificationsPreferencesRequestDto>;
    if (typeof b.orderAlerts !== 'boolean' || typeof b.messageAlerts !== 'boolean') {
      throw new BadRequestException('orderAlerts and messageAlerts must be booleans');
    }
    const data = { orderAlerts: b.orderAlerts, messageAlerts: b.messageAlerts };
    const pref = await this.model('NotificationPreference').upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { userId: pref.userId, orderAlerts: pref.orderAlerts, messageAlerts: pref.messageAlerts };
  }
}
