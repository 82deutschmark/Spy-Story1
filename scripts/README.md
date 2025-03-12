
# Utility Scripts

This directory contains utility scripts used for database maintenance, debugging, and one-time fixes.

## Database Fixes

The `database_fixes` directory contains scripts used to:
- Fix database schema issues
- Migrate data between columns
- Update existing records
- Add missing columns

These scripts are generally intended to be run once to address specific database issues.

## Debugging

The `debugging` directory contains scripts used to:
- Check associations between database tables
- Debug character name issues
- Verify data integrity
- Perform other diagnostic functions

## Usage

Most scripts can be run with Python directly:

```
python scripts/database_fixes/fix_db_columns.py
```

Note: These scripts typically require the main application context and should be run from the project root directory.
