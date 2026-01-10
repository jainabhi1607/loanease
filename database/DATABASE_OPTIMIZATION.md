# ClueFinance Database Optimization Guide

This document outlines the database optimization strategy for ClueFinance to ensure fast access with large datasets.

## Table of Contents
1. [Indexing Strategy](#indexing-strategy)
2. [Query Optimization](#query-optimization)
3. [Performance Features](#performance-features)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Monitoring](#monitoring)

---

## Indexing Strategy

### Primary Indexes

#### Organizations Table
```sql
-- Single column indexes
idx_organizations_abn              -- Fast ABN lookup
idx_organizations_is_active        -- Filter active organizations
idx_organizations_created_at       -- Sort by creation date

-- Full-text search
idx_organizations_company_name_trgm -- Fuzzy search on company names
```

#### User Profiles Table
```sql
-- Single column indexes
idx_user_profiles_user_id          -- Auth user lookup
idx_user_profiles_email            -- Email lookup
idx_user_profiles_role             -- Filter by role
idx_user_profiles_organisation_id  -- Organization users

-- Composite indexes
idx_user_profiles_role_org         -- Filter by role within organization
```

#### Clients Table
```sql
-- Single column indexes
idx_clients_organisation_id        -- Organization's clients
idx_clients_abn                    -- ABN lookup
idx_clients_contact_email          -- Contact lookup

-- Composite indexes
idx_clients_org_abn                -- Unique client per organization

-- Full-text search
idx_clients_entity_name_trgm       -- Fuzzy search on entity names
```

#### Opportunities Table (Most Critical)
```sql
-- Single column indexes
idx_opportunities_opportunity_id   -- CF ID lookup (CF10001, etc.)
idx_opportunities_organisation_id  -- Organization's opportunities
idx_opportunities_client_id        -- Client's opportunities
idx_opportunities_status           -- Filter by status
idx_opportunities_created_by       -- Created by user
idx_opportunities_assigned_to      -- Assigned opportunities

-- Composite indexes (for common queries)
idx_opportunities_org_status       -- Organization + Status filter
idx_opportunities_org_created      -- Organization + Sort by date
idx_opportunities_status_created   -- Status + Sort by date
idx_opportunities_client_status    -- Client + Status filter

-- Sorting indexes
idx_opportunities_created_at       -- Sort by creation (DESC)
idx_opportunities_updated_at       -- Sort by last update
idx_opportunities_status_changed   -- Sort by status change

-- Full-text search
idx_opportunities_notes_search     -- Search in notes and overview

-- JSONB index
idx_opportunities_financial_details -- Query financial data
```

#### Comments Table
```sql
idx_comments_opportunity_id        -- Opportunity comments (with created_at)
idx_comments_user_id              -- User's comments
idx_comments_is_public            -- Filter public/private comments
```

#### Audit Logs Table
```sql
idx_audit_logs_created_at         -- Sort by date
idx_audit_logs_user_id            -- User's actions
idx_audit_logs_table_record       -- Specific record history
idx_audit_logs_action             -- Filter by action type
```

---

## Query Optimization

### Best Practices

#### 1. Always Use Indexes in WHERE Clauses
```sql
-- GOOD: Uses index
SELECT * FROM opportunities
WHERE organisation_id = 'xxx' AND status = 'opportunity'
ORDER BY created_at DESC;

-- BAD: Might not use index
SELECT * FROM opportunities
WHERE UPPER(status) = 'OPPORTUNITY';
```

#### 2. Avoid SELECT * for Large Tables
```sql
-- GOOD: Select only needed columns
SELECT id, opportunity_id, status, loan_amount, created_at
FROM opportunities
WHERE organisation_id = 'xxx';

-- BAD: Fetches all columns including JSONB
SELECT * FROM opportunities WHERE organisation_id = 'xxx';
```

#### 3. Use Composite Indexes Effectively
```sql
-- GOOD: Uses composite index (org_id, status)
SELECT * FROM opportunities
WHERE organisation_id = 'xxx' AND status = 'settled'
ORDER BY created_at DESC;

-- LESS OPTIMAL: Uses only organisation_id index
SELECT * FROM opportunities
WHERE status = 'settled' AND organisation_id = 'xxx';
```

#### 4. Leverage Partial Indexes (WHERE deleted_at IS NULL)
All queries should filter on `deleted_at IS NULL` to use partial indexes:
```sql
-- GOOD: Uses partial index
SELECT * FROM opportunities
WHERE organisation_id = 'xxx' AND deleted_at IS NULL;

-- BAD: Full table scan
SELECT * FROM opportunities
WHERE organisation_id = 'xxx';
```

#### 5. Use Pagination for Large Result Sets
```sql
-- GOOD: Limit results with offset
SELECT * FROM opportunities
WHERE organisation_id = 'xxx'
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- Better: Cursor-based pagination
SELECT * FROM opportunities
WHERE organisation_id = 'xxx'
AND created_at < '2024-01-01'
ORDER BY created_at DESC
LIMIT 50;
```

---

## Performance Features

### 1. Soft Deletes with Partial Indexes
All tables use `deleted_at` for soft deletes. Partial indexes are created with `WHERE deleted_at IS NULL` to exclude deleted records from indexes, improving performance.

### 2. JSONB for Flexible Data
The `financial_details` column in opportunities uses JSONB for:
- Schema flexibility
- Indexed queries using GIN indexes
- Efficient storage

```sql
-- Query JSONB data
SELECT * FROM opportunities
WHERE financial_details->>'fundedFromRental' = 'yes'
AND deleted_at IS NULL;
```

### 3. Trigram Search (pg_trgm)
Enables fuzzy text search on:
- Organization names
- Client entity names

```sql
-- Fuzzy search example
SELECT * FROM organizations
WHERE company_name % 'Acme Corp'  -- Similarity match
ORDER BY similarity(company_name, 'Acme Corp') DESC
LIMIT 10;
```

### 4. Full-Text Search
For searching notes and descriptions:

```sql
-- Full-text search on opportunities
SELECT * FROM opportunities
WHERE to_tsvector('english', COALESCE(notes, '') || ' ' || COALESCE(brief_overview, ''))
@@ to_tsquery('english', 'loan & property')
AND deleted_at IS NULL;
```

### 5. Materialized Views
For complex aggregations that don't need real-time data:

```sql
-- Opportunity statistics (refreshed periodically)
SELECT * FROM mv_opportunity_statistics
WHERE organisation_id = 'xxx';

-- Refresh materialized view
SELECT refresh_opportunity_statistics();
```

### 6. Automatic Triggers
- `updated_at` automatically updated on row changes
- `opportunity_id` automatically generated (CF10001, CF10002, etc.)
- `status_changed_at` tracked when status changes

---

## Maintenance Tasks

### Daily Tasks

#### 1. Refresh Materialized Views
```sql
-- Run daily at off-peak hours
SELECT refresh_opportunity_statistics();
```

#### 2. Clean Expired Sessions
```sql
DELETE FROM user_sessions
WHERE expires_at < NOW() - INTERVAL '30 days';
```

#### 3. Clean Expired Invitations
```sql
UPDATE user_invitations
SET status = 'expired'
WHERE status = 'pending'
AND expires_at < NOW();
```

### Weekly Tasks

#### 1. Vacuum and Analyze
PostgreSQL autovacuum is configured, but manual runs help:
```sql
-- Analyze all tables
ANALYZE;

-- Vacuum high-traffic tables
VACUUM ANALYZE opportunities;
VACUUM ANALYZE comments;
VACUUM ANALYZE audit_logs;
```

#### 2. Reindex (if needed)
```sql
-- Reindex specific tables
REINDEX TABLE opportunities;
REINDEX TABLE clients;
```

### Monthly Tasks

#### 1. Review Slow Queries
```sql
-- Enable slow query logging in PostgreSQL config
-- log_min_duration_statement = 1000  (log queries > 1 second)

-- Review pg_stat_statements
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

#### 2. Update Table Statistics
```sql
-- Update statistics for query planner
ANALYZE VERBOSE;
```

#### 3. Check Index Usage
```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%pkey';

-- Find missing indexes
SELECT schemaname, tablename, seq_scan, seq_tup_read,
       idx_scan, seq_tup_read / seq_scan as avg
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

---

## Monitoring

### Key Metrics to Monitor

#### 1. Query Performance
```sql
-- Top 10 slowest queries
SELECT query, calls, total_time, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### 2. Table Size
```sql
-- Table sizes with indexes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 3. Index Effectiveness
```sql
-- Index hit rate (should be > 95%)
SELECT
    schemaname,
    tablename,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

#### 4. Cache Hit Ratio
```sql
-- Should be > 90%
SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

#### 5. Connection Pooling
Monitor active connections:
```sql
SELECT
    datname,
    count(*) as connections,
    state
FROM pg_stat_activity
GROUP BY datname, state;
```

---

## Expected Performance

With proper indexing and optimization:

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Fetch opportunities by org | < 50ms | With 100,000+ records |
| Search clients by ABN | < 10ms | Using indexed ABN lookup |
| Full-text search | < 100ms | With pg_trgm |
| Opportunity status update | < 20ms | With triggers |
| Fetch user's opportunities | < 30ms | Composite index |
| Complex aggregations | < 200ms | Using materialized views |

---

## Scaling Strategies

### Vertical Scaling (Increase Resources)
1. **RAM**: More RAM = larger cache = fewer disk reads
2. **CPU**: Faster CPU for complex queries
3. **SSD**: Faster disk I/O

### Horizontal Scaling
1. **Read Replicas**: For read-heavy workloads
2. **Connection Pooling**: Use PgBouncer or Supabase pooler
3. **Caching Layer**: Redis for frequently accessed data

### Partitioning (for very large tables)
If `audit_logs` or `opportunities` exceed 10 million rows:

```sql
-- Partition by date range
CREATE TABLE opportunities_2024_01 PARTITION OF opportunities
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE opportunities_2024_02 PARTITION OF opportunities
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

---

## Troubleshooting

### Slow Queries
1. Use `EXPLAIN ANALYZE` to understand query plan
2. Check if indexes are being used
3. Verify statistics are up to date (`ANALYZE`)

### High Disk Usage
1. Run `VACUUM FULL` to reclaim space
2. Archive old audit logs
3. Consider partitioning large tables

### Lock Contention
1. Keep transactions short
2. Avoid long-running queries
3. Use `SELECT FOR UPDATE SKIP LOCKED` for queue-like patterns

---

## Best Practices Summary

✅ **DO:**
- Always filter on `deleted_at IS NULL`
- Use composite indexes for multi-column WHERE clauses
- Limit result sets with pagination
- Use JSONB indexes for flexible data
- Monitor slow query logs
- Run regular VACUUM and ANALYZE
- Use connection pooling

❌ **DON'T:**
- Use `SELECT *` on large tables
- Create indexes without measuring impact
- Forget to add indexes on foreign keys
- Run heavy queries during peak hours
- Ignore database size growth

---

## Additional Resources

- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [Index Usage Patterns](https://www.postgresql.org/docs/current/indexes-types.html)
