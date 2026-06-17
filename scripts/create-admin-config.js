#!/usr/bin/env node
/**
 * Create the admin config document in Firestore
 * Usage: node scripts/create-admin-config.js
 *
 * Requires: firebase-tools to be logged in (firebase login)
 */

const { execSync } = require('child_process');
const https = require('https');

const PROJECT_ID = 'wchw1-f9f49';
const ADMIN_EMAILS = ['matt.n3pay@gmail.com', 'jim.kx0u@gmail.com'];

async function getAccessToken() {
  try {
    // Get token from firebase CLI
    const token = execSync('firebase login:ci --no-localhost 2>/dev/null || npx firebase-tools login:ci --no-localhost 2>/dev/null', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return token;
  } catch {
    // Try using existing firebase auth
    try {
      const result = execSync('cat ~/.config/firebase/tokens.json 2>/dev/null || cat ~/.config/configstore/firebase-tools.json 2>/dev/null', {
        encoding: 'utf8'
      });
      const data = JSON.parse(result);
      return data.tokens?.refresh_token || data.user?.tokens?.refresh_token;
    } catch {
      return null;
    }
  }
}

function makeRequest(accessToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      fields: {
        adminEmails: {
          arrayValue: {
            values: ADMIN_EMAILS.map(email => ({ stringValue: email }))
          }
        }
      }
    });

    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/admin`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  CREATE ADMIN CONFIG');
  console.log('========================================');
  console.log('');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Admin emails: ${ADMIN_EMAILS.join(', ')}`);
  console.log('');

  // Use firebase CLI to set the document directly
  console.log('Creating /config/admin document...');

  try {
    // Build the firebase CLI command
    const docData = JSON.stringify({ adminEmails: ADMIN_EMAILS });

    // Use firebase emulators or direct set isn't available, so we'll use REST API
    // First, let's try to get an access token through gcloud or firebase

    // Alternative: Use the Firebase REST API with API key (for public write - but our rules require auth)
    // So let's use a different approach - write a small firebase-admin script

    const script = `
      const admin = require('firebase-admin');
      admin.initializeApp({ projectId: '${PROJECT_ID}' });
      admin.firestore().doc('config/admin').set({
        adminEmails: ${JSON.stringify(ADMIN_EMAILS)}
      }).then(() => {
        console.log('Document created successfully');
        process.exit(0);
      }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
    `;

    // Check if firebase-admin is available
    try {
      execSync('node -e "require(\'firebase-admin\')"', { stdio: 'pipe' });
      execSync(`node -e "${script.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
      return;
    } catch {
      // firebase-admin not available, try alternative
    }

    // Use firebase CLI set:
    console.log('Using Firebase CLI...');
    const setCommand = `firebase firestore:set --project ${PROJECT_ID} config/admin '${docData}'`;

    try {
      execSync(setCommand, { stdio: 'inherit' });
      console.log('');
      console.log('Success! Admin config document created.');
    } catch {
      console.log('');
      console.log('Firebase CLI set not available. Please create the document manually:');
      console.log('');
      console.log('Go to: https://console.firebase.google.com/project/wchw1-f9f49/firestore');
      console.log('Create collection: config');
      console.log('Create document ID: admin');
      console.log('Add field: adminEmails (array)');
      console.log('  - matt.n3pay@gmail.com');
      console.log('  - jim.kx0u@gmail.com');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
