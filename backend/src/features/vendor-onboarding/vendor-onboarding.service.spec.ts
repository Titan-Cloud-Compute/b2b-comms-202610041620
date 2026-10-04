import { VendorOnboardingService } from './vendor-onboarding.service';

function makePrisma() {
  const profiles: any[] = [];
  const docs: any[] = [];
  return {
    vendorProfile: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = profiles.find((p) => p.userId === where.userId);
        if (existing) return Object.assign(existing, update);
        const p = { id: `p${profiles.length + 1}`, ...create };
        profiles.push(p);
        return p;
      }),
      findUnique: jest.fn(async ({ where }: any) => profiles.find((p) => p.userId === where.userId) ?? null),
    },
    document: {
      create: jest.fn(async ({ data }: any) => {
        const d = { id: `d${docs.length + 1}`, createdAt: new Date(), ...data };
        docs.push(d);
        return d;
      }),
      findMany: jest.fn(async ({ where }: any) => docs.filter((d) => d.vendorProfileId === where.vendorProfileId)),
    },
  };
}

describe('VendorOnboardingService', () => {
  it('creates a profile, a pending document, and lists the documents', async () => {
    const svc = new VendorOnboardingService(makePrisma() as any);
    const profile = await svc.createProfile('u1', { companyName: 'Acme', contactEmail: 'a@acme.test' });
    expect(profile).toEqual({ id: 'p1', companyName: 'Acme', contactEmail: 'a@acme.test' });

    const doc = await svc.createDocument('u1', { filename: 'iso.pdf' });
    expect(doc).toEqual({ id: 'd1', filename: 'iso.pdf', status: 'pending' });

    expect(await svc.listDocuments('u1')).toEqual([{ id: 'd1', filename: 'iso.pdf', status: 'pending' }]);
    expect(await svc.listDocuments('u2')).toEqual([]);
  });

  it('rejects a document upload before a profile exists', async () => {
    const svc = new VendorOnboardingService(makePrisma() as any);
    await expect(svc.createDocument('u1', { filename: 'x.pdf' })).rejects.toThrow('Vendor profile not found');
  });
});
