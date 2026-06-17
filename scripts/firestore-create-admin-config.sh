#!/bin/bash
# Create the admin config document in Firestore
# This sets up the admin emails for the invitation system

set -e

PROJECT_ID="wchw1-f9f49"

echo "========================================"
echo "  CREATE ADMIN CONFIG"
echo "========================================"
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Get access token from Firebase CLI config
CONFIG_FILE="$HOME/.config/configstore/firebase-tools.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Firebase CLI config not found."
    echo "Please run: firebase login"
    exit 1
fi

# Extract access token using node (more reliable than jq for this structure)
ACCESS_TOKEN=$(node -e "console.log(require('$CONFIG_FILE').tokens.access_token)")

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Error: Could not get access token from Firebase CLI."
    echo "Please run: firebase login"
    exit 1
fi

echo "Creating /config/admin document..."

FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/config/admin"

response=$(curl -s -X PATCH \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$FIRESTORE_URL" \
    -d '{
        "fields": {
            "adminEmails": {
                "arrayValue": {
                    "values": [
                        {"stringValue": "matt.n3pay@gmail.com"},
                        {"stringValue": "jim.kx0u@gmail.com"}
                    ]
                }
            }
        }
    }')

# Check if successful
if echo "$response" | grep -q '"adminEmails"'; then
    echo ""
    echo "Success! Admin config document created."
    echo ""
    echo "Admin emails configured:"
    echo "  - matt.n3pay@gmail.com"
    echo "  - jim.kx0u@gmail.com"
else
    echo ""
    echo "Response from API:"
    echo "$response"

    if echo "$response" | grep -q "PERMISSION_DENIED"; then
        echo ""
        echo "Permission denied. The Firestore rules may need to be updated."
        echo "Trying alternative approach..."
    fi
fi
