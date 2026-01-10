-- Database Performance Analysis Script
-- Run this to get a comprehensive performance overview

-- =====================================================
-- 1. TABLE SIZES AND INDEX USAGE
-- =====================================================
\echo '\n=== TABLE SIZES WITH INDEXES ==='
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
    ROUND(100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) /
          NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) AS index_ratio_pct
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 2. SLOW QUERIES (requires pg_stat_statements)
-- =====================================================
\echo '\n=== TOP 10 SLOWEST QUERIES ==='
SELECT
    SUBSTRING(query, 1, 100) AS query_preview,
    calls,
    ROUND(total_time::numeric, 2) AS total_time_ms,
    ROUND(mean_time::numeric, 2) AS mean_time_ms,
    ROUND(max_time::numeric, 2) AS max_time_ms,
    ROUND((stddev_time::numeric), 2) AS stddev_time_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 10;

-- =====================================================
-- 3. INDEX USAGE STATISTICS
-- =====================================================
\echo '\n=== INDEX USAGE (Top 20) ==='
SELECT
    schemaname,
    tablename,
    indexrelname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- =====================================================
-- 4. UNUSED INDEXES (Potential to drop)
-- =====================================================
\echo '\n=== UNUSED INDEXES (Never scanned) ==='
SELECT
    schemaname,
    tablename,
    indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%pkey'
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- 5. CACHE HIT RATIO
-- =====================================================
\echo '\n=== CACHE HIT RATIO (Should be > 90%) ==='
SELECT
    'Cache Hit Ratio' AS metric,
    ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) || '%' AS value
FROM pg_statio_user_tables;

-- =====================================================
-- 6. TABLE BLOAT (Dead tuples)
-- =====================================================
\echo '\n=== TABLE BLOAT (Dead tuples) ==='
SELECT
    schemaname,
    tablename,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_dead_tup > 100
ORDER BY n_dead_tup DESC;

-- =====================================================
-- 7. SEQUENTIAL SCANS (Potential missing indexes)
-- =====================================================
\echo '\n=== TABLES WITH HIGH SEQUENTIAL SCANS ==='
SELECT
    schemaname,
    tablename,
    seq_scan AS sequential_scans,
    seq_tup_read AS rows_read,
    idx_scan AS index_scans,
    CASE
        WHEN seq_scan > 0 THEN ROUND(seq_tup_read::numeric / seq_scan, 2)
        ELSE 0
    END AS avg_rows_per_seq_scan,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 15;

-- =====================================================
-- 8. ACTIVE CONNECTIONS
-- =====================================================
\echo '\n=== ACTIVE CONNECTIONS BY STATE ==='
SELECT
    state,
    count(*) AS connections,
    max(now() - query_start) AS max_duration
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connections DESC;

-- =====================================================
-- 9. LONG RUNNING QUERIES
-- =====================================================
\echo '\n=== LONG RUNNING QUERIES (> 30 seconds) ==='
SELECT
    pid,
    now() - query_start AS duration,
    state,
    SUBSTRING(query, 1, 100) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < now() - INTERVAL '30 seconds'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- =====================================================
-- 10. DATABASE SIZE
-- =====================================================
\echo '\n=== DATABASE SIZE ==='
SELECT
    pg_database.datname AS database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();

-- =====================================================
-- 11. OPPORTUNITY STATISTICS
-- =====================================================
\echo '\n=== OPPORTUNITY STATISTICS BY STATUS ==='
SELECT
    status,
    COUNT(*) AS count,
    pg_size_pretty(SUM(COALESCE(loan_amount, 0))::bigint) AS total_loan_amount,
    ROUND(AVG(COALESCE(loan_amount, 0)), 2) AS avg_loan_amount
FROM opportunities
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- 12. RECENT AUDIT LOG SUMMARY
-- =====================================================
\echo '\n=== AUDIT LOG SUMMARY (Last 24 hours) ==='
SELECT
    table_name,
    action,
    COUNT(*) AS count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, action
ORDER BY count DESC
LIMIT 10;

-- =====================================================
-- 13. RECOMMENDATIONS
-- =====================================================
\echo '\n=== PERFORMANCE RECOMMENDATIONS ==='
DO $$
DECLARE
    cache_hit_ratio NUMERIC;
    unused_index_count INTEGER;
    bloat_tables INTEGER;
BEGIN
    -- Check cache hit ratio
    SELECT ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
    INTO cache_hit_ratio
    FROM pg_statio_user_tables;

    -- Count unused indexes
    SELECT COUNT(*)
    INTO unused_index_count
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey';

    -- Count bloated tables
    SELECT COUNT(*)
    INTO bloat_tables
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 1000;

    RAISE NOTICE '1. Cache Hit Ratio: % %% (Target: > 90%%)', cache_hit_ratio,
        CASE WHEN cache_hit_ratio < 90 THEN ' [NEEDS IMPROVEMENT]' ELSE ' [OK]' END;

    RAISE NOTICE '2. Unused Indexes: % (Consider reviewing)', unused_index_count;

    RAISE NOTICE '3. Tables with Bloat: % (Consider VACUUM)', bloat_tables;

    RAISE NOTICE '4. Run ANALYZE if statistics are outdated';
    RAISE NOTICE '5. Check slow query log for optimization opportunities';
END $$;
