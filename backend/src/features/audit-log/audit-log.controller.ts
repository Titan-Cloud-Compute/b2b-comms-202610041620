import { BadRequestException, Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { AuditLogService } from './audit-log.service';
import {
  GetApiAdminAuditLogResponseDto,
  PostApiAdminAuditLogRequestDto,
  PostApiAdminAuditLogResponseDto,
} from './audit-log.dto';

@ApiTags('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/audit-log')
export class AuditLogController {
  constructor(private readonly auditlog: AuditLogService) {}

  /** GET /api/admin/audit-log — AuditEntry records, oldest first. */
  @Get()
  async getApiAdminAuditLog(): Promise<GetApiAdminAuditLogResponseDto[]> {
    return this.auditlog.list();
  }

  /** POST /api/admin/audit-log — record an AuditEntry; 201 with the created record. */
  @Post()
  @HttpCode(201)
  async postApiAdminAuditLog(
    @Body() body: PostApiAdminAuditLogRequestDto,
  ): Promise<PostApiAdminAuditLogResponseDto & { userId: string }> {
    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    if (!action || !userId) {
      throw new BadRequestException('action and userId are required non-empty strings');
    }
    return this.auditlog.create({ action, userId });
  }
}
