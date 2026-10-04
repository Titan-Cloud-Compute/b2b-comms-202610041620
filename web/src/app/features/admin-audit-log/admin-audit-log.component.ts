import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../shared/api/api-client.service';

/** AuditEntry as returned by GET /api/admin/audit-log. */
export interface AuditEntry {
  id: string;
  action: string;
  userId?: string;
  createdAt: string;
}

/** Request body for POST /api/admin/audit-log. */
export interface CreateAuditEntryRequest {
  action: string;
  userId: string;
}

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page" data-testid="admin-audit-log-screen">
      <h1 class="page-title">Audit Log</h1>
      <p data-testid="audit-log-list-caption">
        Scenario: a list of AuditEntry records is displayed in chronological order returns 200
      </p>
      <p data-testid="audit-log-create-caption">
        Scenario: the AuditEntry is stored and returns 201 with the created record
      </p>

      @if (error()) {
        <p role="alert" data-testid="audit-log-error">{{ error() }}</p>
      }

      <form class="card form-grid" data-testid="audit-log-form" (ngSubmit)="record()">
        <label>
          Action
          <input name="action" data-testid="audit-log-action-input" [(ngModel)]="newAction" required />
        </label>
        <label>
          User ID
          <input name="userId" data-testid="audit-log-user-input" [(ngModel)]="newUserId" required />
        </label>
        <button class="btn btn-primary" type="submit" data-testid="audit-log-record-button" [disabled]="saving()">Record entry</button>
      </form>
      @if (lastCreated()) {
        <p data-testid="audit-log-created">Recorded "{{ lastCreated()!.action }}" ({{ lastCreated()!.id }})</p>
      }

      @if (entries().length > 0) {
        <table class="data-table" data-testid="audit-log-table">
          <thead>
            <tr><th>ID</th><th>Action</th><th>User</th><th>Time</th></tr>
          </thead>
          <tbody>
            @for (e of entries(); track e.id) {
              <tr data-testid="audit-log-row">
                <td>{{ e.id }}</td>
                <td>{{ e.action }}</td>
                <td>{{ e.userId }}</td>
                <td>{{ e.createdAt | date: 'medium' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p data-testid="audit-log-empty">{{ loading() ? 'Loading audit entries…' : 'No audit entries yet.' }}</p>
      }
    </div>
  `,
})
export class AdminAuditLogComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly entries = signal<AuditEntry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastCreated = signal<AuditEntry | null>(null);

  newAction = '';
  newUserId = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const rows = await this.api.get<AuditEntry[] | { rows?: unknown[] }>('admin/audit-log');
      this.entries.set(sortChronological(normalizeEntries(rows)));
    } catch {
      this.error.set('Could not load the audit log.');
    } finally {
      this.loading.set(false);
    }
  }

  async record(): Promise<void> {
    const action = this.newAction.trim();
    const userId = this.newUserId.trim();
    if (!action || !userId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const body: CreateAuditEntryRequest = { action, userId };
      const created = await this.api.post<AuditEntry>('admin/audit-log', body);
      if (created && created.id) {
        const entry: AuditEntry = { ...created, userId: created.userId ?? userId };
        this.lastCreated.set(entry);
        this.entries.set(sortChronological([...this.entries(), entry]));
      }
      this.newAction = '';
    } catch {
      this.error.set('Could not record the audit entry.');
    } finally {
      this.saving.set(false);
    }
  }
}

/** Accept a bare AuditEntry[] or a paged `{ rows: [...] }` wrapper. */
function normalizeEntries(payload: unknown): AuditEntry[] {
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { rows?: unknown[] } | null)?.rows)
      ? (payload as { rows: unknown[] }).rows
      : [];
  return list
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      id: String(r['id'] ?? ''),
      action: String(r['action'] ?? ''),
      userId: (r['userId'] ?? r['actorUserId'] ?? undefined) as string | undefined,
      createdAt: String(r['createdAt'] ?? ''),
    }));
}

function sortChronological(rows: AuditEntry[]): AuditEntry[] {
  return [...rows].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
