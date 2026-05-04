-- Seed initial stages for Purchase & Procurement stage group
-- Note: Quote Approved covers both single-vendor and multi-vendor scenarios

INSERT INTO category_stage_config (category_type, stage_name, sort_order, days_before_event, is_terminal)
VALUES
  ('purchase_procurement', 'Brief',                 1, 0, false),
  ('purchase_procurement', 'Vendor Identification', 2, 0, false),
  ('purchase_procurement', 'Quotes Collected',      3, 0, false),
  ('purchase_procurement', 'Quote Approved',        4, 0, false),
  ('purchase_procurement', 'PO Raised',             5, 0, false),
  ('purchase_procurement', 'Payment Done',          6, 0, false),
  ('purchase_procurement', 'Dispatch',              7, 0, false),
  ('purchase_procurement', 'Site Delivery',         8, 0, false),
  ('purchase_procurement', 'Verified on Ground',    9, 0, true);
