/**
 * Legal document registry — content/legal_documents.json
 */

import raw from '@content/legal_documents.json';

export interface LegalDocumentEntry {
  id: string;
  title: string;
  repo_path: string;
  document_version: string;
  effective_date: string;
  required_for_acceptance: boolean;
  internal_only: boolean;
}

export interface LegalDocumentsRegistry {
  _version: string;
  _bundle_version: string;
  _description: string;
  documents: LegalDocumentEntry[];
}

export const legalDocuments = raw as LegalDocumentsRegistry;

export const LEGAL_BUNDLE_VERSION = legalDocuments._bundle_version;
