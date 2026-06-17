#!/bin/bash
# Delete all Firestore data
# WARNING: This permanently deletes ALL data from your Firestore database!

set -e

PROJECT_ID="wchw1-f9f49"

echo "========================================"
echo "  FIRESTORE DATA DELETION"
echo "========================================"
echo ""
echo "WARNING: This will permanently delete ALL data from Firestore!"
echo "Project: $PROJECT_ID"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Deleting all collections..."

# Delete each known collection
# Add any additional collections here as needed
COLLECTIONS=(
    "users"
    "signalReports"
    "repeaters"
    "invitations"
    "openGroups"
    "openGroupNotifications"
    "config"
)

for collection in "${COLLECTIONS[@]}"; do
    echo "Deleting collection: $collection"
    firebase firestore:delete --project "$PROJECT_ID" -r "$collection" --force 2>/dev/null || echo "  (collection may not exist or is empty)"
done

echo ""
echo "Done! All Firestore data has been deleted."
