import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { PostApiVendorDocumentsRequestDto, PostApiVendorProfileRequestDto } from './vendor-onboarding.dto';

@ApiTags('vendor-onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('api/vendor')
export class VendorOnboardingController {
  constructor(private readonly vendoronboarding: VendorOnboardingService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  async postApiVendorProfile(@Req() req: Request, @Body() body: PostApiVendorProfileRequestDto) {
    return this.vendoronboarding.createProfile(req.session!.userId, body);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async postApiVendorDocuments(@Req() req: Request, @Body() body: PostApiVendorDocumentsRequestDto) {
    return this.vendoronboarding.createDocument(req.session!.userId, body);
  }

  @Get('documents')
  async getApiVendorDocuments(@Req() req: Request) {
    return this.vendoronboarding.listDocuments(req.session!.userId);
  }
}
