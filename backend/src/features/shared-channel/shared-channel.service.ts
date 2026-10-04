import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiChannelsResponseDto,
  PostApiChannelsIdMessagesRequestDto,
  PostApiChannelsIdMessagesResponseDto,
  PostApiChannelsRequestDto,
  PostApiChannelsResponseDto,
} from './shared-channel.dto';

@Injectable()
export class SharedChannelService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Channel', 'Message'] as const);
  }

  async createChannel(userId: string, dto: PostApiChannelsRequestDto): Promise<PostApiChannelsResponseDto> {
    const name = typeof dto?.name === 'string' ? dto.name.trim() : '';
    if (!name) throw new BadRequestException('name is required');
    const profile = await this.model('VendorProfile').findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('vendor profile required to create a channel');
    const channel = await this.model('Channel').create({
      data: { name, vendorId: profile.id, vendorProfileId: profile.id },
    });
    return { id: channel.id, name: channel.name };
  }

  async postMessage(
    userId: string,
    channelId: string,
    dto: PostApiChannelsIdMessagesRequestDto,
  ): Promise<PostApiChannelsIdMessagesResponseDto> {
    const body = typeof dto?.body === 'string' ? dto.body.trim() : '';
    if (!body) throw new BadRequestException('body is required');
    const channel = await this.model('Channel').findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('channel not found');
    const message = await this.model('Message').create({
      data: { body, channelId, senderId: userId },
    });
    return { id: message.id, body: message.body, channelId: message.channelId };
  }

  async listChannels(): Promise<GetApiChannelsResponseDto[]> {
    const channels = await this.model('Channel').findMany({ orderBy: { createdAt: 'desc' } });
    return channels.map((c) => ({ id: c.id, name: c.name }));
  }
}
