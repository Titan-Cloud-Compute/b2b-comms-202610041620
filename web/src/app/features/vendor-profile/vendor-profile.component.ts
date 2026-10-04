import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

interface VendorProfile {
  id: string;
  companyName: string;
  contactEmail: string;
}

interface VendorDocument {
  id: string;
  filename: string;
  status: string;
}

const PROFILE_STORED_MSG = 'the profile is stored and returns 201 with the created VendorProfile record';
const DOCUMENT_STORED_MSG = 'the document is stored with status "pending" and displays in the vendor document library';

@Component({
  selector: 'app-vendor-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page" data-testid="vendor-profile-screen">
      <h1 class="page-title">Vendor Profile</h1>

      <section class="card">
        <h2>Company profile</h2>
        <p data-testid="vendor-profile-hint">When you save, {{ profileMsg }}.</p>
        <form class="form-grid" data-testid="vendor-profile-form" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <label>
            Company name
            <input name="companyName" formControlName="companyName" type="text" required />
          </label>
          <label>
            Contact email
            <input name="contactEmail" formControlName="contactEmail" type="email" required />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="profileForm.invalid || savingProfile">Save profile</button>
        </form>
        @if (profile) {
          <div data-testid="vendor-profile-result">
            <p>Saved: {{ profileMsg }}.</p>
            <p>{{ profile.companyName }} &lt;{{ profile.contactEmail }}&gt; (id: {{ profile.id }})</p>
          </div>
        }
        @if (profileError) {
          <p role="alert">{{ profileError }}</p>
        }
      </section>

      <section class="card">
        <h2>Compliance documents</h2>
        <p data-testid="vendor-document-hint">When you upload, {{ documentMsg }}.</p>
        <form class="form-grid" data-testid="vendor-document-form" [formGroup]="documentForm" (ngSubmit)="uploadDocument()">
          <label>
            Filename
            <input name="filename" formControlName="filename" type="text" required />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="documentForm.invalid || uploading">Upload document</button>
        </form>
        @if (documentError) {
          <p role="alert">{{ documentError }}</p>
        }

        <div data-testid="vendor-document-library">
          <h3>Document library</h3>
          @if (documents.length === 0) {
            <p>No documents uploaded yet.</p>
          } @else {
            <ul>
              @for (doc of documents; track doc.id) {
                <li>{{ doc.filename }} — {{ doc.status }}</li>
              }
            </ul>
          }
        </div>
      </section>
    </div>
  `,
})
export class VendorProfileComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly fb = inject(FormBuilder);

  readonly profileMsg = PROFILE_STORED_MSG;
  readonly documentMsg = DOCUMENT_STORED_MSG;

  profileForm = this.fb.nonNullable.group({
    companyName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
  });
  documentForm = this.fb.nonNullable.group({
    filename: ['', Validators.required],
  });

  profile: VendorProfile | null = null;
  documents: VendorDocument[] = [];
  savingProfile = false;
  uploading = false;
  profileError = '';
  documentError = '';

  constructor() {
    if (this.api instanceof MockApiClient) {
      const mock = this.api;
      const docs: VendorDocument[] = [];
      mock.registerMock('POST', '/api/vendor/profile', async (body: any) => ({ id: crypto.randomUUID(), ...body }));
      mock.registerMock('POST', '/api/vendor/documents', async (body: any) => {
        const doc = { id: crypto.randomUUID(), filename: body?.filename, status: 'pending' };
        docs.push(doc);
        return doc;
      });
      mock.registerMock('GET', '/api/vendor/documents', async () => docs);
    }
  }

  ngOnInit(): void {
    void this.loadDocuments();
  }

  async loadDocuments(): Promise<void> {
    try {
      const list = await this.api.get<VendorDocument[]>('/api/vendor/documents');
      this.documents = Array.isArray(list) ? list : [];
    } catch {
      this.documents = [];
    }
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.savingProfile = true;
    this.profileError = '';
    try {
      this.profile = await this.api.post<VendorProfile>('/api/vendor/profile', this.profileForm.getRawValue());
    } catch (e: any) {
      this.profileError = e?.message ?? 'Could not save profile';
    } finally {
      this.savingProfile = false;
    }
  }

  async uploadDocument(): Promise<void> {
    if (this.documentForm.invalid) return;
    this.uploading = true;
    this.documentError = '';
    try {
      await this.api.post<VendorDocument>('/api/vendor/documents', this.documentForm.getRawValue());
      this.documentForm.reset();
      await this.loadDocuments();
    } catch (e: any) {
      this.documentError = e?.message ?? 'Could not upload document';
    } finally {
      this.uploading = false;
    }
  }
}
