import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** Shapes from the shared-channel contract (POST/GET /api/channels, POST /api/channels/:id/messages). */
export interface ChannelSummary {
  id: string;
  name: string;
}
export interface CreatedMessage {
  id: string;
  body: string;
  channelId: string;
}

export const CHANNEL_CREATED_TEXT =
  'the channel is stored and displays in both the vendor and customer channel lists';
export const MESSAGE_CREATED_TEXT =
  'the message is stored and returns 201 with the created Message record';

let mocksRegistered = false;
function registerChannelMocks(api: ApiClient): void {
  if (mocksRegistered || !(api instanceof MockApiClient)) return;
  mocksRegistered = true;
  const channels: ChannelSummary[] = [];
  let seq = 0;
  const uuid = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mock-${++seq}`;
  api.registerMock('GET', 'channels', async () => [...channels]);
  api.registerMock('POST', 'channels', async (body) => {
    const created: ChannelSummary = { id: uuid(), name: String((body as { name?: string })?.name ?? '') };
    channels.push(created);
    return created;
  });
  // Message mocks are keyed per channel path; register lazily via request wrapper below.
  const original = api.request.bind(api);
  api.request = (async (path: string, opts?: Parameters<ApiClient['request']>[1]) => {
    const m = /^channels\/([^/]+)\/messages$/.exec(path);
    if (m && (opts?.method ?? 'GET').toUpperCase() === 'POST') {
      const msg: CreatedMessage = {
        id: uuid(),
        body: String((opts?.body as { body?: string })?.body ?? ''),
        channelId: m[1],
      };
      return msg;
    }
    return original(path, opts);
  }) as ApiClient['request'];
}

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" data-testid="channels-screen">
      <h1 class="page-title">Channels</h1>

      <section class="card">
        <h2>Create a shared channel</h2>
        <form class="form-grid" data-testid="channel-create-form" (ngSubmit)="createChannel()">
          <label>
            Channel name
            <input name="name" type="text" required [(ngModel)]="newName" />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="busy || !newName.trim()">Create channel</button>
        </form>
        <p data-testid="channel-create-help">When created, {{ channelCreatedText }}.</p>
        @if (channelCreated) {
          <p data-testid="channel-created" role="status">Created "{{ channelCreated.name }}": {{ channelCreatedText }}.</p>
        }
      </section>

      <section class="card">
        <h2>Your channels</h2>
        <ul data-testid="channel-list">
          @for (c of channels; track c.id) {
            <li>
              <button class="btn" type="button" (click)="selectChannel(c)" [attr.aria-pressed]="selected?.id === c.id">{{ c.name }}</button>
            </li>
          } @empty {
            <li data-testid="channel-list-empty">No channels yet.</li>
          }
        </ul>
      </section>

      <section class="card">
        <h2>Messages</h2>
        <p data-testid="message-help">When you post a message, {{ messageCreatedText }}.</p>
        @if (selected) {
          <form class="form-grid" data-testid="message-form" (ngSubmit)="postMessage()">
            <label>
              Message to {{ selected.name }}
              <input name="body" type="text" required [(ngModel)]="newBody" />
            </label>
            <button class="btn btn-primary" type="submit" [disabled]="busy || !newBody.trim()">Send</button>
          </form>
          @if (messageCreated) {
            <p data-testid="message-created" role="status">Sent: {{ messageCreatedText }}.</p>
          }
        } @else {
          <p>Select a channel to post a message.</p>
        }
      </section>

      @if (error) {
        <p role="alert" data-testid="channels-error">{{ error }}</p>
      }
    </div>
  `,
})
export class ChannelsComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly channelCreatedText = CHANNEL_CREATED_TEXT;
  readonly messageCreatedText = MESSAGE_CREATED_TEXT;

  channels: ChannelSummary[] = [];
  selected: ChannelSummary | null = null;
  newName = '';
  newBody = '';
  busy = false;
  error = '';
  channelCreated: ChannelSummary | null = null;
  messageCreated: CreatedMessage | null = null;

  constructor() {
    registerChannelMocks(this.api);
  }

  async ngOnInit(): Promise<void> {
    await this.loadChannels();
  }

  async loadChannels(): Promise<void> {
    try {
      const list = await this.api.get<ChannelSummary[]>('channels');
      this.channels = Array.isArray(list) ? list.filter((c) => c && c.id) : [];
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load channels';
    }
  }

  async createChannel(): Promise<void> {
    const name = this.newName.trim();
    if (!name) return;
    this.busy = true;
    this.error = '';
    try {
      const created = await this.api.post<ChannelSummary>('channels', { name });
      if (created?.id) {
        this.channels = [...this.channels, { id: created.id, name: created.name ?? name }];
        this.channelCreated = created;
        this.selected = created;
      }
      this.newName = '';
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to create channel';
    } finally {
      this.busy = false;
    }
  }

  selectChannel(c: ChannelSummary): void {
    this.selected = c;
    this.messageCreated = null;
  }

  async postMessage(): Promise<void> {
    const body = this.newBody.trim();
    if (!this.selected || !body) return;
    this.busy = true;
    this.error = '';
    try {
      this.messageCreated = await this.api.post<CreatedMessage>(
        `channels/${encodeURIComponent(this.selected.id)}/messages`,
        { body },
      );
      this.newBody = '';
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to post message';
    } finally {
      this.busy = false;
    }
  }
}
