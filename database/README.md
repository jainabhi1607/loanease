# ClueFinance Database

This directory contains the optimized database schema, migration scripts, and maintenance tools for ClueFinance.

## Directory Structure

```
database/
├── README.md                          # This file
├── DATABASE_OPTIMIZATION.md           # Comprehensive optimization guide
├── QUICK_REFERENCE.md                 # Quick reference for common operations
├── migrations/
│   └── 001_optimized_schema.sql      # Main schema with indexes and RLS
└── scripts/
    ├── analyze_performance.sql       # Performance analysis tool
    └── maintenance.sql               # Maintenance scripts
```

## Quick Start

### 1. Apply Database Schema

Run the migration on your Supabase instance:

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL editor in Supabase Dashboard
# Copy and paste contents of migrations/001_optimized_schema.sql
```

### 2. Verify Installation

Check that all tables and indexes are created:

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- List all indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

### 3. Run Performance Analysis

```bash
# Connect to your database and run
psql -f database/scripts/analyze_performance.sql
```

## Key Features

### 🚀 Performance Optimizations

1. **Comprehensive Indexing**
   - Single-column indexes on frequently queried fields
   - Composite indexes for common multi-column queries
   - Partial indexes excluding soft-deleted records
   - GIN indexes for JSONB and full-text search

2. **Query Optimization**
   - Materialized views for complex aggregations
   - Trigram indexes for fuzzy text search
   - Full-text search capabilities
   - Efficient soft-delete implementation

3. **Automatic Features**
   - Auto-updating `updated_at` timestamps
   - Sequential opportunity ID generation (CF10000+)
   - Status change tracking
   - Audit logging triggers

4. **Scalability**
   - Optimized for millions of records
   - Connection pooling ready
   - Prepared for table partitioning
   - Read replica compatible

### 🔒 Security Features

1. **Row Level Security (RLS)**
   - Data isolation by organization
   - Role-based access control
   - Automatic policy enforcement

2. **Audit Trail**
   - All changes logged to `audit_logs`
   - IP address tracking
   - User action history

3. **Soft Deletes**
   - No data permanently lost
   - Easy recovery
   - Maintains referential integrity

## Database Tables

### Core Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `organizations` | Referrer companies | abn, company_name, is_active |
| `user_profiles` | User accounts | email, role, organisation_id |
| `clients` | Client records (scoped per referrer) | organisation_id, abn, entity_name |
| `opportunities` | Loan opportunities | opportunity_id, organisation_id, status |
| `comments` | Opportunity communications | opportunity_id, is_public |
| `audit_logs` | Change tracking | table_name, record_id, created_at |

### Support Tables

| Table | Purpose |
|-------|---------|
| `organization_directors` | Company directors and contacts |
| `user_sessions` | Session tracking with IP monitoring |
| `user_invitations` | Invitation management |

## Performance Expectations

With proper setup and indexing:

| Operation | Expected Time | Dataset Size |
|-----------|---------------|--------------|
| Fetch opportunities by org | < 50ms | 100,000+ records |
| Search clients | < 10ms | 50,000+ records |
| Full-text search | < 100ms | Large dataset |
| Status updates | < 20ms | Any size |
| Complex aggregations | < 200ms | Via materialized views |

## Maintenance Schedule

### Daily (Automated via Cron)
- Refresh materialized views
- Clean expired sessions
- Update invitation statuses

### Weekly
```bash
psql -f database/scripts/maintenance.sql
```

### Monthly
```bash
psql -f database/scripts/analyze_performance.sql
```

## Common Operations

### Add New Index
```sql
-- Always use CONCURRENTLY to avoid locking
CREATE INDEX CONCURRENTLY idx_new_index
ON table_name(column_name)
WHERE deleted_at IS NULL;
```

### Archive Old Data
```sql
-- Move old audit logs to archive
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Optimize Table
```sql
-- Reclaim space and update statistics
VACUUM ANALYZE opportunities;
```

## Monitoring

### Check Database Health
```bash
psql -f database/scripts/analyze_performance.sql
```

Key metrics to watch:
- Cache hit ratio (should be > 90%)
- Index usage (unused indexes waste space)
- Table bloat (dead tuples)
- Query performance (slow queries)

### Supabase Dashboard
Monitor via Supabase dashboard:
- Database → Performance
- Database → Query Performance
- Settings → Database Settings

## Troubleshooting

### Slow Queries?
1. Check query plan: `EXPLAIN ANALYZE SELECT ...`
2. Verify indexes exist on WHERE columns
3. Update statistics: `ANALYZE table_name;`
4. Check [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md)

### High Memory Usage?
1. Check for long-running queries
2. Verify connection pooling is enabled
3. Consider increasing database size

### Table Locks?
1. Check active connections: `SELECT * FROM pg_stat_activity;`
2. Identify blocking queries
3. Use `SELECT FOR UPDATE SKIP LOCKED` for queues

## Migration Strategy

### From Development to Production

1. **Test in Staging**
   ```bash
   # Apply to staging database first
   supabase db push --db-url $STAGING_DB_URL
   ```

2. **Backup Production**
   ```bash
   # Create backup before migration
   supabase db dump -f backup.sql
   ```

3. **Apply to Production**
   ```bash
   # During low-traffic window
   supabase db push --db-url $PRODUCTION_DB_URL
   ```

4. **Verify**
   ```bash
   # Run performance analysis
   psql -f database/scripts/analyze_performance.sql
   ```

## Best Practices

✅ **Do:**
- Use soft deletes (`deleted_at`)
- Add `WHERE deleted_at IS NULL` to all queries
- Use composite indexes for multi-column filters
- Paginate large result sets
- Monitor slow query logs
- Run regular maintenance

❌ **Don't:**
- Hard delete records
- Use `SELECT *` on large tables
- Create indexes without measuring impact
- Forget to analyze tables after bulk operations
- Run heavy queries during peak hours

## Resources

- [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) - Comprehensive optimization guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick command reference
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)

## Support

For database-related issues:
1. Check logs in Supabase Dashboard
2. Run performance analysis script
3. Review optimization guide
4. Contact database administrator

---

**Note:** This database schema is optimized for performance with large datasets. All queries should filter on `deleted_at IS NULL` to utilize partial indexes effectively.
