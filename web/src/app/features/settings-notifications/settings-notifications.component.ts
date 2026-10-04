import { Component, OnInit, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** Mirrors the NotificationPreference contract: GET/PUT /api/notifications/preferences. */
export interface NotificationPreferenceDto {
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}

const PREFS_PATH = '/api/notifications/preferences';

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="page" data-testid="settings-notifications-screen">
      <h1 class="page-title">Notification Settings</h1>
      <p>
        Choose which alerts you receive. When you save, the preferences are updated and returns 200 with the stored NotificationPreference record.
        Turning both off means the preferences are updated with both alert fields stored as false.
      </p>
      <form class="card form-grid" (submit)="save($event)">
        <label>
          <input
            type="checkbox"
            data-testid="pref-order-alerts"
            name="orderAlerts"
            [checked]="orderAlerts"
            (change)="orderAlerts = $any($event.target).checked"
          />
          Order alerts
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="pref-message-alerts"
            name="messageAlerts"
            [checked]="messageAlerts"
            (change)="messageAlerts = $any($event.target).checked"
          />
          Message alerts
        </label>
        <button class="btn btn-primary" type="submit" data-testid="pref-save" [disabled]="saving">Save</button>
      </form>
      <p *ngIf="saved" data-testid="pref-status">
        Saved: order alerts {{ saved.orderAlerts ? 'on' : 'off' }}, message alerts {{ saved.messageAlerts ? 'on' : 'off' }}.
      </p>
      <p *ngIf="error" data-testid="pref-error" role="alert">{{ error }}</p>
    </div>
  `,
})
export class SettingsNotificationsComponent implements OnInit {
  private readonly api = inject(ApiClient);

  orderAlerts = true;
  messageAlerts = true;
  saving = false;
  saved: NotificationPreferenceDto | null = null;
  error = '';

  constructor() {
    if (this.api instanceof MockApiClient) {
      let store: NotificationPreferenceDto = { userId: 'mock-user', orderAlerts: true, messageAlerts: true };
      this.api.registerMock('GET', PREFS_PATH, async () => store);
      this.api.registerMock('PUT', PREFS_PATH, async (body) => {
        const b = (body ?? {}) as Partial<NotificationPreferenceDto>;
        store = { ...store, orderAlerts: !!b.orderAlerts, messageAlerts: !!b.messageAlerts };
        return store;
      });
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      const pref = await this.api.get<NotificationPreferenceDto>(PREFS_PATH);
      if (pref && typeof pref.orderAlerts === 'boolean') this.orderAlerts = pref.orderAlerts;
      if (pref && typeof pref.messageAlerts === 'boolean') this.messageAlerts = pref.messageAlerts;
    } catch {
      this.error = 'Could not load notification preferences.';
    }
  }

  async save(event?: Event): Promise<void> {
    event?.preventDefault();
    this.saving = true;
    this.error = '';
    const body = { orderAlerts: this.orderAlerts, messageAlerts: this.messageAlerts };
    try {
      const res = await this.api.request<Partial<NotificationPreferenceDto>>(PREFS_PATH, { method: 'PUT', body });
      this.saved = {
        userId: res?.userId ?? '',
        orderAlerts: typeof res?.orderAlerts === 'boolean' ? res.orderAlerts : body.orderAlerts,
        messageAlerts: typeof res?.messageAlerts === 'boolean' ? res.messageAlerts : body.messageAlerts,
      };
      this.orderAlerts = this.saved.orderAlerts;
      this.messageAlerts = this.saved.messageAlerts;
    } catch {
      this.error = 'Could not save notification preferences.';
    } finally {
      this.saving = false;
    }
  }
}
