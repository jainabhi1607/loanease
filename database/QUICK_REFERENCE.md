# Database Quick Reference Guide

Quick commands and queries for common database operations.

## Performance Checks

### Check Query Performance
```sql
-- Analyze a specific query
EXPLAIN ANALYZE
SELECT * FROM opportunities
WHERE organisation_id = 'xxx' AND status = 'opportunity'
ORDER BY created_at DESC;
```

### Check Index Usage
```sql
-- See if indexes are being used
SELECT idx_scan, idx_tup_read, idx_tup_fetch, indexrelname
FROM pg_stat_user_indexes
WHERE tablename = 'opportunities'
ORDER BY idx_scan DESC;
```

### Check Table Size
```sql
-- Get table and index sizes
SELECT pg_size_pretty(pg_total_relation_size('opportunities'));
```

## Common Queries

### Fetch Opportunities by Organization
```sql
-- Optimized query using composite index
SELECT id, opportunity_id, status, loan_amount, created_at
FROM opportunities
WHERE organisation_id = 'xxx'
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Search Clients by Name
```sql
-- Fuzzy search using trigram index
SELECT id, entity_name, abn, contact_email
FROM clients
WHERE entity_name % 'search term'
AND organisation_id = 'xxx'
AND deleted_at IS NULL
ORDER BY similarity(entity_name, 'search term') DESC
LIMIT 20;
```

### Get Opportunity Statistics
```sql
-- Use materialized view for fast results
SELECT status, count, total_loan_amount
FROM mv_opportunity_statistics
WHERE organisation_id = 'xxx';
```

### Full-Text Search on Opportunities
```sql
-- Search in notes and brief overview
SELECT id, opportunity_id, brief_overview
FROM opportunities
WHERE to_tsvector('english', COALESCE(notes, '') || ' ' || COALESCE(brief_overview, ''))
@@ to_tsquery('english', 'property & loan')
AND deleted_at IS NULL;
```

## Maintenance Commands

### Daily
```bash
# Refresh materialized views
psql -f database/scripts/maintenance.sql
```

### Weekly
```sql
-- Vacuum and analyze
VACUUM ANALYZE opportunities;
ANALYZE;
```

### Monthly
```sql
-- Run performance analysis
psql -f database/scripts/analyze_performance.sql
```

## Monitoring

### Active Connections
```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```

### Slow Queries
```sql
SELECT query, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Cache Hit Ratio
```sql
SELECT ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) || '%'
FROM pg_statio_user_tables;
```

## Troubleshooting

### Query Too Slow?
1. Run `EXPLAIN ANALYZE` on the query
2. Check if indexes exist on WHERE columns
3. Verify `deleted_at IS NULL` is in WHERE clause
4. Consider using composite indexes

### Table Too Large?
1. Check dead tuples: `SELECT n_dead_tup FROM pg_stat_user_tables WHERE tablename = 'xxx';`
2. Run VACUUM: `VACUUM ANALYZE tablename;`
3. Consider archiving old data

### Index Not Being Used?
1. Update statistics: `ANALYZE tablename;`
2. Check query plan with `EXPLAIN`
3. Verify WHERE clause matches index columns

## Best Practices

✅ **Always:**
- Filter on `deleted_at IS NULL`
- Use pagination (`LIMIT` and `OFFSET`)
- Select only needed columns
- Use composite indexes for multi-column filters

❌ **Never:**
- Use `SELECT *` on large tables
- Forget to add indexes on foreign keys
- Run long transactions during peak hours
- Hard delete records (use soft delete)

## Index Naming Convention

- `idx_` - Regular index
- `idx_tablename_column` - Single column index
- `idx_tablename_col1_col2` - Composite index
- `idx_tablename_column_trgm` - Trigram index for fuzzy search

## Common Index Patterns

### Single Column
```sql
CREATE INDEX idx_opportunities_status ON opportunities(status) WHERE deleted_at IS NULL;
```

### Composite Index
```sql
CREATE INDEX idx_opportunities_org_status ON opportunities(organisation_id, status) WHERE deleted_at IS NULL;
```

### Trigram (Fuzzy Search)
```sql
CREATE INDEX idx_clients_entity_name_trgm ON clients USING gin(entity_name gin_trgm_ops) WHERE deleted_at IS NULL;
```

### JSONB
```sql
CREATE INDEX idx_opportunities_financial_details ON opportunities USING gin(financial_details) WHERE deleted_at IS NULL;
```

### Full-Text Search
```sql
CREATE INDEX idx_opportunities_notes_search ON opportunities USING gin(to_tsvector('english', COALESCE(notes, ''))) WHERE deleted_at IS NULL;
```
