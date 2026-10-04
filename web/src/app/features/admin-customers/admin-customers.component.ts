import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, ApiError, MockApiClient } from '../../shared/api/api-client';

interface InviteResponse {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

interface CustomerRow {
  id: string;
  email: string;
}

const LIST_PATH = '/api/admin/customers';
const INVITE_PATH = '/api/admin/customers/invite';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="admin-customers-screen">
      <h1>Customer Management</h1>

      <section>
        <h2>Invite a customer</h2>
        <ul>
          <li>When you invite a new email, a Customer record is created and returns 201 with invitationSent true.</li>
          <li>If the email was already invited, the response returns 409 error indicating the customer already exists.</li>
        </ul>
        <form (ngSubmit)="invite()">
          <label for="invite-email">Customer email</label>
          <input
            id="invite-email"
            data-testid="invite-email"
            type="email"
            name="email"
            required
            [(ngModel)]="email"
          />
          <button type="submit" data-testid="invite-submit" [disabled]="busy || !email">
            Send invitation
          </button>
        </form>
        @if (success) {
          <p data-testid="invite-success" role="status">{{ success }}</p>
        }
        @if (error) {
          <p data-testid="invite-error" role="alert">{{ error }}</p>
        }
      </section>

      <section>
        <h2>Customers</h2>
        @if (customers.length === 0) {
          <p data-testid="customers-empty">No customers invited yet.</p>
        } @else {
          <ul data-testid="customers-list">
            @for (c of customers; track c.id) {
              <li>{{ c.email }}</li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class AdminCustomersComponent implements OnInit {
  private readonly api = inject(ApiClient);

  email = '';
  busy = false;
  success = '';
  error = '';
  customers: CustomerRow[] = [];

  constructor() {
    if (this.api instanceof MockApiClient) {
      registerCustomerInviteMocks(this.api);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.customers = (await this.api.get<CustomerRow[]>(LIST_PATH)) ?? [];
    } catch {
      this.customers = [];
    }
  }

  async invite(): Promise<void> {
    const email = this.email.trim();
    if (!email) return;
    this.busy = true;
    this.success = '';
    this.error = '';
    try {
      const res = await this.api.post<InviteResponse>(INVITE_PATH, { email });
      if (res?.invitationSent) {
        this.success = `Invitation sent to ${res.email}.`;
        this.email = '';
      }
      await this.load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        this.error = 'customer already exists';
      } else {
        this.error = (e as Error)?.message || 'Invitation failed';
      }
    } finally {
      this.busy = false;
    }
  }
}

let mocksRegistered = false;
function registerCustomerInviteMocks(client: MockApiClient): void {
  if (mocksRegistered) return;
  mocksRegistered = true;
  const rows: CustomerRow[] = [];
  client.registerMock('GET', LIST_PATH, async () => [...rows]);
  client.registerMock('POST', INVITE_PATH, async (body) => {
    const email = String((body as { email?: string })?.email ?? '').trim().toLowerCase();
    if (rows.some(r => r.email === email)) {
      throw new ApiError(409, 'customer already exists');
    }
    const row = { id: crypto.randomUUID(), email };
    rows.push(row);
    return { customerId: row.id, email, invitationSent: true };
  });
}
