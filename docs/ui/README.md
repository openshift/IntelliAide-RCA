# UI-served legal and product documents

Markdown here is **committed**, copied into the API container (`COPY docs/ui/`), and registered in [`content/legal_documents.json`](../../content/legal_documents.json).

When you add or change a document:

1. Edit the `.md` file in this directory.
2. Update `document_version` / `effective_date` in the file and in `legal_documents.json`.
3. Bump **`notice.document_version`** (bundle) in `src/api/config/config.json.template` and instance defaults so users re-accept.
4. Rebuild the API image.

Served at `GET /instance/legal-document/{id}` (see registry `id` values).

**Local-only migration notes:** `docs/notes/OFFICIAL_REPO_MIGRATION_OPEN_QUESTIONS.md` (gitignored).
