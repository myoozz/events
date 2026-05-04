-- Seed initial stages for three new Stage Config groups
-- Print Only, Print & Fabrication, Design — Digital Output

INSERT INTO category_stage_config (category_type, stage_name, sort_order, days_before_event, is_terminal)
VALUES
  -- Print Only
  ('print_only', 'Brief',            1, 0, false),
  ('print_only', 'Design',           2, 0, false),
  ('print_only', 'Client Approval',  3, 0, false),
  ('print_only', 'Print Production', 4, 0, false),
  ('print_only', 'QC',               5, 0, false),
  ('print_only', 'Dispatch',         6, 0, false),
  ('print_only', 'Installed',        7, 0, true),

  -- Print & Fabrication
  ('print_fabrication', 'Brief',                 1, 0, false),
  ('print_fabrication', 'Design',                2, 0, false),
  ('print_fabrication', 'Client Approval',       3, 0, false),
  ('print_fabrication', 'Material Procurement',  4, 0, false),
  ('print_fabrication', 'Fabrication',           5, 0, false),
  ('print_fabrication', 'QC',                    6, 0, false),
  ('print_fabrication', 'Dispatch',              7, 0, false),
  ('print_fabrication', 'Installation',          8, 0, false),
  ('print_fabrication', 'Site Sign-off',         9, 0, true),

  -- Design — Digital Output
  ('design_digital', 'Brief',              1, 0, false),
  ('design_digital', 'Concept',            2, 0, false),
  ('design_digital', 'Draft',              3, 0, false),
  ('design_digital', 'Revisions',          4, 0, false),
  ('design_digital', 'Client Approval',    5, 0, false),
  ('design_digital', 'Final File Handoff', 6, 0, true);
