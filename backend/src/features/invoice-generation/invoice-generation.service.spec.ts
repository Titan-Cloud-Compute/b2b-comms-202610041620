import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceGenerationService } from './invoice-generation.service';

describe('InvoiceGenerationService', () => {
  const makePrisma = () => ({
    order: { findUnique: jest.fn() },
    invoice: { upsert: jest.fn(), findUnique: jest.fn() },
  });

  it('creates an invoice for a confirmed order', async () => {
    const prisma = makePrisma();
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });
    prisma.invoice.upsert.mockResolvedValue({ id: 'i1', orderId: 'o1', amount: 10.5 });
    const svc = new InvoiceGenerationService(prisma as unknown as PrismaService);
    await expect(svc.create('o1', 10.5)).resolves.toEqual({ id: 'i1', orderId: 'o1', amount: 10.5 });
  });

  it('rejects unconfirmed orders', async () => {
    const prisma = makePrisma();
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'pending' });
    const svc = new InvoiceGenerationService(prisma as unknown as PrismaService);
    await expect(svc.create('o1', 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s for a missing order', async () => {
    const prisma = makePrisma();
    prisma.order.findUnique.mockResolvedValue(null);
    const svc = new InvoiceGenerationService(prisma as unknown as PrismaService);
    await expect(svc.create('x', 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a downloadUrl for an existing invoice', async () => {
    const prisma = makePrisma();
    prisma.invoice.findUnique.mockResolvedValue({ id: 'i1', orderId: 'o1', amount: 1 });
    const svc = new InvoiceGenerationService(prisma as unknown as PrismaService);
    await expect(svc.getDownload('i1')).resolves.toEqual({ id: 'i1', downloadUrl: '/api/invoices/i1/file' });
  });

  it('404s for a missing invoice', async () => {
    const prisma = makePrisma();
    prisma.invoice.findUnique.mockResolvedValue(null);
    const svc = new InvoiceGenerationService(prisma as unknown as PrismaService);
    await expect(svc.getDownload('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
