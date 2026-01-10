-- Database Maintenance Scripts
-- Run these periodically to maintain optimal performance

-- =====================================================
-- DAILY MAINTENANCE
-- =====================================================

-- 1. Refresh Materialized Views
\echo 'Refreshing materialized views...'
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_opportunity_statistics;

-- 2. Clean up expired sessions
\echo 'Cleaning up expired sessions...'
DELETE FROM user_sessions
WHERE expires_at < NOW() - INTERVAL '30 days';

-- 3. Update expired invitations
\echo 'Updating expired invitations...'
UPDATE user_invitations
SET status = 'expired'
WHERE status = 'pending'
AND expires_at < NOW();

-- =====================================================
-- WEEKLY MAINTENANCE
-- =====================================================

-- 1. Vacuum and analyze high-traffic tables
\echo 'Running VACUUM ANALYZE on high-traffic tables...'
VACUUM ANALYZE opportunities;
VACUUM ANALYZE comments;
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE clients;
VACUUM ANALYZE user_sessions;

-- 2. Update statistics for all tables
\echo 'Updating table statistics...'
ANALYZE;

-- =====================================================
-- MONTHLY MAINTENANCE
-- =====================================================

-- 1. Reindex tables if needed (run during off-peak hours)
-- Uncomment to run:
-- \echo 'Reindexing opportunities table...'
-- REINDEX TABLE CONCURRENTLY opportunities;
-- REINDEX TABLE CONCURRENTLY clients;

-- 2. Archive old audit logs (older than 1 year)
\echo 'Archiving old audit logs...'
-- You can create an archive table or export to file
CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL);

-- Move old logs to archive
WITH moved_logs AS (
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO audit_logs_archive
SELECT * FROM moved_logs;

-- 3. Check for missing indexes
\echo 'Checking for potential missing indexes...'
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    ROUND(100.0 * seq_tup_read / NULLIF(seq_scan, 0), 2) AS avg_seq_tuples,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND seq_scan > 100
AND seq_tup_read / NULLIF(seq_scan, 0) > 1000
ORDER BY seq_tup_read DESC;

-- =====================================================
-- EMERGENCY MAINTENANCE
-- =====================================================

-- Run this if database is experiencing performance issues

-- 1. Kill idle connections (older than 1 hour)
-- Uncomment to run:
-- \echo 'Killing idle connections...'
-- SELECT pg_terminate_backend(pid)
-- FROM pg_stat_activity
-- WHERE state = 'idle'
-- AND state_change < NOW() - INTERVAL '1 hour'
-- AND pid != pg_backend_pid();

-- 2. Full vacuum (reclaim disk space) - BLOCKING operation
-- Only run during maintenance window:
-- \echo 'Running VACUUM FULL (blocking)...'
-- VACUUM FULL opportunities;
-- VACUUM FULL audit_logs;

-- 3. Reset statistics (if corrupted)
-- \echo 'Resetting statistics...'
-- SELECT pg_stat_reset();

\echo 'Maintenance complete!'
