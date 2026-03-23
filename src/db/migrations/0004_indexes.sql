-- Add missing indexes for performance
-- messages: tenant_id used in all conversation queries but has no index
CREATE INDEX IF NOT EXISTS messages_tenant_id_idx ON messages(tenant_id);

-- contact_notes: contact_id used on every conversation view (no index currently)
CREATE INDEX IF NOT EXISTS contact_notes_contact_id_idx ON contact_notes(contact_id);

-- deals: (contact_id, pipeline_id) composite used by bulk-create dedup check
CREATE INDEX IF NOT EXISTS deals_contact_pipeline_idx ON deals(contact_id, pipeline_id);
