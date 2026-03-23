#!/bin/bash

# Configuration
DB_NAME="cbt_platform"
DB_USER="postgres"
BACKUP_DIR="/home/ubuntu/backups/db"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cbt_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting backup of $DB_NAME at $(date)..."
pg_dump -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
echo "Backup completed: ${BACKUP_FILE}.gz"

# Remove old backups (older than RETENTION_DAYS)
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days."
echo "Backup process finished at $(date)."
