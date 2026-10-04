import { Injectable } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import { PostApiAdminAuditLogRequestDto } from './audit-log.dto';

export interface AuditEntryView {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

type AuditEntryRow = { id: string; action: string; userId: string; createdAt: Date | string };

function toView(row: AuditEntryRow): AuditEntryView {
  return {
    id: row.id,
    action: row.action,
    userId: row.userId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

@Injectable()
export class AuditLogService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['AuditEntry']);
  }

  /** All AuditEntry records in chronological (oldest-first) order. */
  async list(): Promise<AuditEntryView[]> {
    const rows = await this.model('AuditEntry').findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toView);
  }

  /** Store a new AuditEntry and return it. */
  async create(dto: PostApiAdminAuditLogRequestDto): Promise<AuditEntryView> {
    const row = await this.model('AuditEntry').create({
      data: { action: dto.action, userId: dto.userId },
    });
    return toView(row);
  }
}
