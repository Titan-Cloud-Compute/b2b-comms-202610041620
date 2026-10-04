import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { SharedChannelService } from './shared-channel.service';
import {
  GetApiChannelsResponseDto,
  PostApiChannelsIdMessagesRequestDto,
  PostApiChannelsIdMessagesResponseDto,
  PostApiChannelsRequestDto,
  PostApiChannelsResponseDto,
} from './shared-channel.dto';

function sessionUserId(req: Request): string {
  const userId = req.session?.userId;
  if (!userId) throw new UnauthorizedException('not authenticated');
  return userId;
}

@ApiTags('shared-channel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/channels')
export class SharedChannelController {
  constructor(private readonly sharedchannel: SharedChannelService) {}

  @Post()
  @Roles(UserRole.VENDOR)
  async createChannel(
    @Req() req: Request,
    @Body() body: PostApiChannelsRequestDto,
  ): Promise<PostApiChannelsResponseDto> {
    return this.sharedchannel.createChannel(sessionUserId(req), body);
  }

  @Post(':id/messages')
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async postMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: PostApiChannelsIdMessagesRequestDto,
  ): Promise<PostApiChannelsIdMessagesResponseDto> {
    return this.sharedchannel.postMessage(sessionUserId(req), id, body);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async listChannels(): Promise<GetApiChannelsResponseDto[]> {
    return this.sharedchannel.listChannels();
  }
}
