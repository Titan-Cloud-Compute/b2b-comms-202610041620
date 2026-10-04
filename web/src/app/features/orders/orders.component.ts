import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

// Contract shapes for the order-management endpoints.
// (@contracts/* is not present in this web package, so the shapes are declared locally.)
export interface OrderItemInput { description: string; quantity: number; unitPrice: number; }
export interface CreateOrderRequest { vendorId: string; items: OrderItemInput[]; }
export interface OrderResponse { id: string; status: string; customerId?: string; vendorId?: string; }
export interface ConfirmOrderRequest { estimatedDelivery: string; }

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="orders-screen">
      <h1>Orders</h1>

      <section>
        <h2>Place a purchase order</h2>
        <p data-testid="order-create-caption">the order is stored with status "pending" and returns 201 with the created Order record</p>
        <form data-testid="order-form" (ngSubmit)="submit()">
          <label>Vendor ID
            <input name="vendorId" type="text" [(ngModel)]="vendorId" required />
          </label>
          <label>Item description
            <input name="description" type="text" [(ngModel)]="description" required />
          </label>
          <label>Quantity
            <input name="quantity" type="number" min="1" step="1" [(ngModel)]="quantity" required />
          </label>
          <label>Unit price
            <input name="unitPrice" type="number" min="0" step="0.01" [(ngModel)]="unitPrice" required />
          </label>
          <button type="submit" data-testid="order-submit" [disabled]="submitting">Submit purchase order</button>
        </form>
        @if (createError) {
          <p data-testid="order-create-error" role="alert">{{ createError }}</p>
        }
        @if (created) {
          <p data-testid="order-created">Order {{ created.id }} created with status "{{ created.status }}"</p>
        }
      </section>

      <section>
        <h2>Orders</h2>
        <p data-testid="order-confirm-caption">the order is updated to status "confirmed" and displays to the customer as confirmed</p>
        <ul data-testid="orders-list">
          @for (o of orders; track o.id) {
            <li data-testid="order-row">
              <span>{{ o.id }}</span> — <span data-testid="order-status">{{ o.status }}</span>
              @if (o.status === 'pending') {
                <label>Estimated delivery
                  <input type="date" [name]="'eta-' + o.id" [(ngModel)]="eta[o.id]" />
                </label>
                <button type="button" data-testid="order-confirm" [disabled]="confirming === o.id" (click)="confirm(o)">Confirm</button>
              }
            </li>
          } @empty {
            <li data-testid="orders-empty">No orders yet.</li>
          }
        </ul>
        @if (listError) {
          <p data-testid="orders-error" role="alert">{{ listError }}</p>
        }
      </section>
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  private readonly api = inject(ApiClient);

  vendorId = '';
  description = '';
  quantity: number | null = 1;
  unitPrice: number | null = null;

  orders: OrderResponse[] = [];
  eta: Record<string, string> = {};
  submitting = false;
  confirming: string | null = null;
  created: OrderResponse | null = null;
  createError = '';
  listError = '';

  constructor() {
    if (this.api instanceof MockApiClient) {
      registerOrderMocks(this.api);
    }
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.listError = '';
    try {
      const res = await this.api.get<OrderResponse[]>('/api/orders');
      this.orders = Array.isArray(res) ? res.filter(o => o && o.id) : [];
    } catch (e: any) {
      this.listError = e?.message || 'Could not load orders.';
    }
  }

  async submit(): Promise<void> {
    this.createError = '';
    this.created = null;
    const vendorId = this.vendorId.trim();
    const description = this.description.trim();
    const quantity = Number(this.quantity);
    const unitPrice = Number(this.unitPrice);
    if (!vendorId) { this.createError = 'Vendor ID is required.'; return; }
    if (!description) { this.createError = 'Item description is required.'; return; }
    if (!Number.isInteger(quantity) || quantity <= 0) { this.createError = 'Quantity must be a positive whole number.'; return; }
    if (this.unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) { this.createError = 'Unit price must be zero or more.'; return; }
    this.submitting = true;
    try {
      const body: CreateOrderRequest = { vendorId, items: [{ description, quantity, unitPrice }] };
      this.created = await this.api.post<OrderResponse>('/api/orders', body);
      await this.load();
    } catch (e: any) {
      this.createError = e?.message || 'Could not place order.';
    } finally {
      this.submitting = false;
    }
  }

  async confirm(order: OrderResponse): Promise<void> {
    this.listError = '';
    const estimatedDelivery = this.eta[order.id];
    if (!estimatedDelivery) { this.listError = 'Choose an estimated delivery date first.'; return; }
    this.confirming = order.id;
    try {
      const body: ConfirmOrderRequest = { estimatedDelivery };
      await this.api.patch<OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}/confirm`, body);
      await this.load();
    } catch (e: any) {
      this.listError = e?.message || 'Could not confirm order.';
    } finally {
      this.confirming = null;
    }
  }
}

// ─── Mocks (used only when MockApiClient is active) ───────────────────────────

const mockOrders: OrderResponse[] = [];

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function registerOrderMocks(client: MockApiClient): void {
  client.registerMock<OrderResponse[]>('GET', '/api/orders', async () => mockOrders.map(o => ({ ...o })));
  client.registerMock<OrderResponse>('POST', '/api/orders', async body => {
    const req = body as CreateOrderRequest;
    const order: OrderResponse = { id: uuid(), status: 'pending', customerId: uuid(), vendorId: req.vendorId };
    mockOrders.unshift(order);
    // MockApiClient keys on exact paths, so register the per-id confirm handler.
    client.registerMock<OrderResponse>('PATCH', `/api/orders/${order.id}/confirm`, async () => {
      order.status = 'confirmed';
      return { id: order.id, status: order.status };
    });
    return { ...order };
  });
}
