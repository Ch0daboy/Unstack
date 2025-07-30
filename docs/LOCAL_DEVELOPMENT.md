# Local Development with Supabase

This guide explains how to set up and use the local Supabase environment for BookGen development.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ and npm
- Supabase CLI (already installed via npm)

### Start Local Development
```bash
# Option 1: Use the helper script
./scripts/dev-local.sh start

# Option 2: Manual steps
npm run supabase:start
npm run dev:local
```

## 📋 Available Services

When Supabase is running locally, you have access to:

| Service | URL | Description |
|---------|-----|-------------|
| **API** | http://127.0.0.1:54321 | Main Supabase API endpoint |
| **Studio** | http://127.0.0.1:54323 | Database management interface |
| **Database** | postgresql://postgres:postgres@127.0.0.1:54322/postgres | Direct database access |
| **Inbucket** | http://127.0.0.1:54324 | Email testing (catches all emails) |

## 🛠️ Development Commands

### Using npm scripts:
```bash
# Start Supabase
npm run supabase:start

# Stop Supabase
npm run supabase:stop

# Reset database (destroys all data)
npm run supabase:reset

# Check status
npm run supabase:status

# Start app with local config
npm run dev:local
```

### Using the helper script:
```bash
# Start everything
./scripts/dev-local.sh start

# Stop Supabase
./scripts/dev-local.sh stop

# Restart Supabase
./scripts/dev-local.sh restart

# Reset database
./scripts/dev-local.sh reset

# Open Studio in browser
./scripts/dev-local.sh studio

# Show status
./scripts/dev-local.sh status

# Show logs
./scripts/dev-local.sh logs
```

## 🔧 Configuration

### Environment Files
- `.env` - Production/remote Supabase configuration
- `.env.local` - Local development configuration (auto-generated)

### Local Configuration
The local environment uses these settings:
- **Database**: PostgreSQL on port 54322
- **API**: Port 54321
- **Studio**: Port 54323
- **Auth**: Local JWT tokens (not secure, dev only)

## 🗄️ Database Management

### Accessing the Database
1. **Via Studio**: Open http://127.0.0.1:54323
2. **Via CLI**: 
   ```bash
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```

### Migrations
- Migrations are automatically applied when starting Supabase
- Located in `supabase/migrations/`
- Applied in chronological order

### Seeding Data
- Seed file: `supabase/seed.sql`
- Run automatically after migrations
- Add test data here for development

## 🔐 Authentication

### Local Auth
- Uses local JWT tokens
- No email verification required
- All auth providers work locally
- Emails are caught by Inbucket (port 54324)

### Test Users
Create test users through:
1. The application signup form
2. Supabase Studio Auth section
3. Direct API calls

## 📊 Monitoring & Debugging

### Logs
```bash
# View all logs
./scripts/dev-local.sh logs

# View specific service logs
docker logs supabase_db_bookgen
docker logs supabase_auth_bookgen
```

### Studio Features
- **Table Editor**: View and edit data
- **SQL Editor**: Run custom queries
- **Auth**: Manage users and sessions
- **Storage**: File management
- **Logs**: View real-time logs

## 🔄 Common Workflows

### Starting Fresh
```bash
./scripts/dev-local.sh stop
./scripts/dev-local.sh reset
./scripts/dev-local.sh start
```

### Switching Between Local and Remote
```bash
# Use local
cp .env.local .env
npm run dev

# Use remote
cp .env.production .env  # or your remote config
npm run dev
```

### Database Schema Changes
1. Make changes in Studio or via migrations
2. Generate migration:
   ```bash
   npx supabase db diff -f new_migration_name
   ```
3. Apply migration:
   ```bash
   npx supabase db reset
   ```

## 🐛 Troubleshooting

### Port Conflicts
If ports are in use:
1. Stop other Supabase instances: `npx supabase stop --project-id <id>`
2. Change ports in `supabase/config.toml`
3. Update `.env.local` accordingly

### Docker Issues
```bash
# Check Docker status
docker ps

# Clean up containers
docker system prune

# Restart Docker Desktop
```

### Database Connection Issues
```bash
# Check if database is running
npx supabase status

# Reset if needed
npx supabase db reset
```

### Migration Errors
```bash
# View migration status
npx supabase migration list

# Reset and reapply
npx supabase db reset
```

## 📝 Best Practices

### Development
- Always use `.env.local` for local development
- Keep migrations small and focused
- Test auth flows with Inbucket
- Use Studio for data inspection

### Data Management
- Use seed files for test data
- Don't commit sensitive data
- Reset database regularly during development
- Backup important test data

### Performance
- Local database is fast but limited
- Use realistic data volumes for testing
- Monitor logs for slow queries

## 🔗 Useful Links

- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. View logs: `./scripts/dev-local.sh logs`
3. Check Supabase status: `npx supabase status`
4. Reset environment: `./scripts/dev-local.sh reset`
