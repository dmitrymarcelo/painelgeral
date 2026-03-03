-- Contagem por tabela para apoio na reuniao
-- Execute com: psql "$DATABASE_URL" -f docs/sql/REUNIAO_CONTAGENS_TABELAS.sql

SELECT 'tenants' AS tabela, COUNT(*) AS total FROM tenants
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'audit_log_attributes', COUNT(*) FROM audit_log_attributes
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'notification_deliveries', COUNT(*) FROM notification_deliveries
UNION ALL SELECT 'assets', COUNT(*) FROM assets
UNION ALL SELECT 'asset_status_history', COUNT(*) FROM asset_status_history
UNION ALL SELECT 'maintenance_plans', COUNT(*) FROM maintenance_plans
UNION ALL SELECT 'maintenance_rules', COUNT(*) FROM maintenance_rules
UNION ALL SELECT 'maintenance_executions', COUNT(*) FROM maintenance_executions
UNION ALL SELECT 'calendar_events', COUNT(*) FROM calendar_events
UNION ALL SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL SELECT 'work_order_tasks', COUNT(*) FROM work_order_tasks
UNION ALL SELECT 'work_order_assignments', COUNT(*) FROM work_order_assignments
UNION ALL SELECT 'work_order_history', COUNT(*) FROM work_order_history
UNION ALL SELECT 'import_jobs', COUNT(*) FROM import_jobs
UNION ALL SELECT 'import_rows', COUNT(*) FROM import_rows
UNION ALL SELECT 'import_errors', COUNT(*) FROM import_errors
UNION ALL SELECT 'import_row_fields', COUNT(*) FROM import_row_fields
ORDER BY tabela;
