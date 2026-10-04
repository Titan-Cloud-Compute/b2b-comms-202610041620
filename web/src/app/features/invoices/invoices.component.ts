import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

// Contract shapes for POST /api/invoices and GET /api/invoices/:id/download.
// (@contracts/* is not present in this web package, so the shapes are declared locally.)
export interface CreateInvoiceRequest { orderId: string; amount: number; }
export interface InvoiceResponse { id: string; orderId: string; amount: number; }
export interface InvoiceDownloadResponse { id: string; downloadUrl: string; }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" data-testid="invoices-screen">
      <h1 class="page-title">Invoices</h1>

      <section class="card">
        <h2>Generate invoice</h2>
        <p data-testid="invoice-generate-caption">the invoice is created and returns 201 with the invoice id available for download</p>
        <form class="form-grid" data-testid="invoice-generate-form" (ngSubmit)="generate()">
          <label>Order ID
            <input name="orderId" type="text" [(ngModel)]="orderId" required />
          </label>
          <label>Amount
            <input name="amount" type="number" step="0.01" min="0" [(ngModel)]="amount" required />
          </label>
          <button class="btn btn-primary" type="submit" data-testid="invoice-generate-submit" [disabled]="generating">Generate invoice</button>
        </form>
        @if (generateError) {
          <p data-testid="invoice-generate-error" role="alert">{{ generateError }}</p>
        }
        @if (created) {
          <p data-testid="invoice-created">Invoice created (201): <span data-testid="invoice-created-id">{{ created.id }}</span></p>
        }
      </section>

      <section class="card">
        <h2>Download invoice</h2>
        <p data-testid="invoice-download-caption">the response returns 200 with a downloadUrl pointing to the stored invoice</p>
        <form class="form-grid" data-testid="invoice-download-form" (ngSubmit)="download()">
          <label>Invoice ID
            <input name="invoiceId" type="text" [(ngModel)]="invoiceId" required />
          </label>
          <button class="btn btn-primary" type="submit" data-testid="invoice-download-submit" [disabled]="downloading">Get download link</button>
        </form>
        @if (downloadError) {
          <p data-testid="invoice-download-error" role="alert">{{ downloadError }}</p>
        }
        @if (downloadResult) {
          <p>Download (200): <a data-testid="invoice-download-link" [href]="downloadResult.downloadUrl" target="_blank" rel="noopener">{{ downloadResult.downloadUrl }}</a></p>
        }
      </section>
    </div>
  `,
})
export class InvoicesComponent {
  private readonly api = inject(ApiClient);

  orderId = '';
  amount: number | null = null;
  invoiceId = '';

  generating = false;
  downloading = false;
  created: InvoiceResponse | null = null;
  downloadResult: InvoiceDownloadResponse | null = null;
  generateError = '';
  downloadError = '';

  constructor() {
    if (this.api instanceof MockApiClient) {
      registerInvoiceMocks(this.api);
    }
  }

  async generate(): Promise<void> {
    this.generateError = '';
    this.created = null;
    const orderId = this.orderId.trim();
    const amount = Number(this.amount);
    if (!UUID_RE.test(orderId)) { this.generateError = 'Order ID must be a valid UUID.'; return; }
    if (this.amount === null || !Number.isFinite(amount) || amount <= 0) { this.generateError = 'Amount must be a positive number.'; return; }
    this.generating = true;
    try {
      const body: CreateInvoiceRequest = { orderId, amount };
      this.created = await this.api.post<InvoiceResponse>('/api/invoices', body);
      if (this.created?.id) this.invoiceId = this.created.id;
    } catch (e: any) {
      this.generateError = e?.message || 'Could not generate invoice.';
    } finally {
      this.generating = false;
    }
  }

  async download(): Promise<void> {
    this.downloadError = '';
    this.downloadResult = null;
    const id = this.invoiceId.trim();
    if (!UUID_RE.test(id)) { this.downloadError = 'Invoice ID must be a valid UUID.'; return; }
    this.downloading = true;
    try {
      this.downloadResult = await this.api.get<InvoiceDownloadResponse>(`/api/invoices/${encodeURIComponent(id)}/download`);
    } catch (e: any) {
      this.downloadError = e?.message || 'Could not get download link.';
    } finally {
      this.downloading = false;
    }
  }
}

// ─── Mocks (used only when MockApiClient is active) ───────────────────────────

const mockInvoices = new Map<string, InvoiceResponse>();

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function registerInvoiceMocks(client: MockApiClient): void {
  client.registerMock<InvoiceResponse>('POST', '/api/invoices', async body => {
    const req = body as CreateInvoiceRequest;
    const inv: InvoiceResponse = { id: uuid(), orderId: req.orderId, amount: Number(req.amount) };
    mockInvoices.set(inv.id, inv);
    // Register the per-id download handler (MockApiClient keys on exact paths).
    client.registerMock<InvoiceDownloadResponse>('GET', `/api/invoices/${inv.id}/download`, async () => ({
      id: inv.id,
      downloadUrl: `/mock-storage/invoices/${inv.id}.pdf`,
    }));
    return inv;
  });
}
