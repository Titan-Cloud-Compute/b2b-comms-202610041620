import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PostApiVendorDocumentsRequestDto,
  PostApiVendorDocumentsResponseDto,
  PostApiVendorProfileRequestDto,
  PostApiVendorProfileResponseDto,
  GetApiVendorDocumentsResponseDto,
} from './vendor-onboarding.dto';

@Injectable()
export class VendorOnboardingService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['VendorProfile', 'Document']);
  }

  async createProfile(userId: string, body: PostApiVendorProfileRequestDto): Promise<PostApiVendorProfileResponseDto> {
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
    const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : '';
    if (!companyName || !contactEmail) {
      throw new BadRequestException('companyName and contactEmail are required');
    }
    const profile = await this.model('VendorProfile').upsert({
      where: { userId },
      create: { userId, companyName, contactEmail },
      update: { companyName, contactEmail },
    });
    return { id: profile.id, companyName: profile.companyName, contactEmail: profile.contactEmail };
  }

  async createDocument(userId: string, body: PostApiVendorDocumentsRequestDto): Promise<PostApiVendorDocumentsResponseDto> {
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    if (!filename) throw new BadRequestException('filename is required');
    const profile = await this.model('VendorProfile').findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Vendor profile not found');
    const doc = await this.model('Document').create({
      data: { filename, status: 'pending', vendorProfileId: profile.id },
    });
    return { id: doc.id, filename: doc.filename, status: doc.status };
  }

  async listDocuments(userId: string): Promise<GetApiVendorDocumentsResponseDto[]> {
    const profile = await this.model('VendorProfile').findUnique({ where: { userId } });
    if (!profile) return [];
    const docs = await this.model('Document').findMany({
      where: { vendorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => ({ id: d.id, filename: d.filename, status: d.status }));
  }
}
