import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SharedChannelService } from './shared-channel.service';

function makePrisma() {
  return {
    vendorProfile: { findUnique: jest.fn() },
    channel: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    message: { create: jest.fn() },
  };
}

describe('SharedChannelService', () => {
  it('creates a channel owned by the vendor profile', async () => {
    const prisma = makePrisma();
    prisma.vendorProfile.findUnique.mockResolvedValue({ id: 'vp1' });
    prisma.channel.create.mockResolvedValue({ id: 'c1', name: 'Ops' });
    const svc = new SharedChannelService(prisma as never);
    await expect(svc.createChannel('u1', { name: 'Ops' })).resolves.toEqual({ id: 'c1', name: 'Ops' });
    expect(prisma.channel.create).toHaveBeenCalledWith({
      data: { name: 'Ops', vendorId: 'vp1', vendorProfileId: 'vp1' },
    });
  });

  it('rejects channel creation without name or vendor profile', async () => {
    const prisma = makePrisma();
    const svc = new SharedChannelService(prisma as never);
    await expect(svc.createChannel('u1', { name: ' ' })).rejects.toBeInstanceOf(BadRequestException);
    prisma.vendorProfile.findUnique.mockResolvedValue(null);
    await expect(svc.createChannel('u1', { name: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores a message with the session user as sender', async () => {
    const prisma = makePrisma();
    prisma.channel.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.message.create.mockResolvedValue({ id: 'm1', body: 'hi', channelId: 'c1', senderId: 'u2' });
    const svc = new SharedChannelService(prisma as never);
    await expect(svc.postMessage('u2', 'c1', { body: 'hi' })).resolves.toEqual({ id: 'm1', body: 'hi', channelId: 'c1' });
    expect(prisma.message.create).toHaveBeenCalledWith({ data: { body: 'hi', channelId: 'c1', senderId: 'u2' } });
  });

  it('404s when posting to an unknown channel', async () => {
    const prisma = makePrisma();
    prisma.channel.findUnique.mockResolvedValue(null);
    const svc = new SharedChannelService(prisma as never);
    await expect(svc.postMessage('u2', 'nope', { body: 'hi' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists channels', async () => {
    const prisma = makePrisma();
    prisma.channel.findMany.mockResolvedValue([{ id: 'c1', name: 'Ops', vendorId: 'vp1' }]);
    const svc = new SharedChannelService(prisma as never);
    await expect(svc.listChannels()).resolves.toEqual([{ id: 'c1', name: 'Ops' }]);
  });
});
