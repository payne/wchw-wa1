#!/bin/bash
# Backup all Firestore data to local JSON files
# Requires: firebase CLI logged in, jq installed

set -e

PROJECT_ID="wchw1-f9f49"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_SUBDIR="$BACKUP_DIR/$TIMESTAMP"

echo "========================================"
echo "  FIRESTORE DATA BACKUP"
echo "========================================"
echo ""
echo "Project: $PROJECT_ID"
echo "Backup location: $BACKUP_SUBDIR"
echo ""

# Check for required tools
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

# Get Firebase access token
echo "Getting Firebase access token..."
ACCESS_TOKEN=$(firebase login:ci --no-localhost 2>/dev/null || gcloud auth print-access-token 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
    # Try using the default application credentials
    ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || echo "")
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Error: Could not get access token. Make sure you're logged in with:"
    echo "  firebase login"
    echo "  or"
    echo "  gcloud auth login"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_SUBDIR"

# Collections to backup
COLLECTIONS=(
    "users"
    "signalReports"
    "repeaters"
    "invitations"
    "openGroups"
    "openGroupNotifications"
    "config"
)

FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents"

backup_collection() {
    local collection=$1
    local output_file="$BACKUP_SUBDIR/${collection}.json"

    echo "Backing up collection: $collection"

    # Fetch all documents from the collection
    response=$(curl -s -X GET \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$FIRESTORE_URL/$collection")

    # Check if we got documents
    if echo "$response" | jq -e '.documents' > /dev/null 2>&1; then
        echo "$response" | jq '.documents' > "$output_file"
        doc_count=$(jq 'length' "$output_file")
        echo "  Saved $doc_count documents to ${collection}.json"
    else
        # Empty collection or doesn't exist
        echo "[]" > "$output_file"
        echo "  Collection is empty or doesn't exist"
    fi
}

# Backup each collection
for collection in "${COLLECTIONS[@]}"; do
    backup_collection "$collection"
done

# Create a summary file
echo ""
echo "Creating backup summary..."
cat > "$BACKUP_SUBDIR/backup-info.json" << EOF
{
    "project": "$PROJECT_ID",
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "collections": $(printf '%s\n' "${COLLECTIONS[@]}" | jq -R . | jq -s .)
}
EOF

echo ""
echo "========================================"
echo "  BACKUP COMPLETE"
echo "========================================"
echo "Location: $BACKUP_SUBDIR"
echo ""
echo "Files created:"
ls -la "$BACKUP_SUBDIR"
