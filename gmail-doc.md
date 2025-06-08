# Gmail Attachment Fetcher (gmail.js) Documentation

This document describes the Gmail Attachment Fetcher module (`gmail.js`), which retrieves CSV attachments from specific Gmail messages and saves them to a local directory.

---

## Table of Contents

1. [Overview](#overview)  
2. [Prerequisites](#prerequisites)  
3. [Configuration](#configuration)  
4. [Helper Functions](#helper-functions)  
   - [findCsvParts(parts, found)](#findcsvpartsparts-found)  
5. [Main Function](#main-function)  
   - [fetchAttachments()](#fetchattachments)  
6. [Error Handling](#error-handling)  
7. [Usage Example](#usage-example)  
8. [Exported API](#exported-api)  

---

## Overview

The Gmail Attachment Fetcher module automates:

- Connecting to the Gmail API via OAuth2.
- Searching for unread emails with a specific subject and attachments.
- Extracting CSV attachments and saving them locally.
- Optionally marking emails as read.

---

## Prerequisites

- Node.js (v12+ recommended)  
- `googleapis` package installed  
- OAuth2 credentials for Gmail API  

Install dependencies:

```bash
npm install googleapis dotenv
```

---

## Configuration

Store your OAuth2 and folder settings in a `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
GOOGLE_REFRESH_TOKEN=your_refresh_token
ATTACHMENTS_FOLDER=attachments
```

- `GOOGLE_*` values: Credentials from Google Cloud Console.  
- `ATTACHMENTS_FOLDER`: Directory to save attachments (default: `attachments`).  

---

## Helper Functions

### findCsvParts(parts, found)

Recursively searches email payload parts for attachments ending with `.csv`.

- **Parameters**  
  - `parts` (Array): Gmail message parts to inspect.  
  - `found` (Array): Accumulator for found CSV part objects.  

- **Returns**  
  - Array of part objects representing CSV attachments.

```js
function findCsvParts(parts = [], found = []) {
  for (const part of parts) {
    if (part.parts) {
      findCsvParts(part.parts, found);
    } else if (part.filename && part.filename.toLowerCase().endsWith('.csv')) {
      found.push(part);
    }
  }
  return found;
}
```

---

## Main Function

### fetchAttachments()

Fetches up to 20 unread Gmail messages with subject `rep-apt-auto` and CSV attachments, then:

1. Retrieves each message.
2. Identifies CSV parts via `findCsvParts`.
3. Downloads attachments and writes files locally.
4. Logs successes and returns array of file paths.

```js
async function fetchAttachments() {
  log('📧 Fetching emails with CSV attachments...');

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:rep-apt-auto is:unread has:attachment',
    maxResults: 20,
  });

  const messages = res.data.messages || [];
  const savedFiles = [];

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    });

    const parts = msg.data.payload.parts || [];
    const csvParts = findCsvParts(parts);

    for (const part of csvParts) {
      const attachmentId = part.body.attachmentId;
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: message.id,
        id: attachmentId,
      });

      const filename = part.filename || `attachment-${Date.now()}.csv`;
      const folder = path.join(__dirname, process.env.ATTACHMENTS_FOLDER || 'attachments');

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      const filePath = path.join(folder, filename);
      fs.writeFileSync(filePath, Buffer.from(attachment.data.data, 'base64'));

      savedFiles.push(filePath);
      log(`✅ Saved attachment: ${filename}`);
    }
  }

  return savedFiles;
}
```

---

## Error Handling

- Network and API errors are propagated to the caller.
- Ensure valid OAuth2 credentials and Gmail API scopes.  
- Directory creation errors may occur if permissions are insufficient.

---

## Usage Example

```js
const { fetchAttachments } = require('./gmail');

(async () => {
  try {
    const files = await fetchAttachments();
    console.log('Downloaded files:', files);
  } catch (err) {
    console.error('Error fetching attachments:', err);
  }
})();
```

---

## Exported API

- `fetchAttachments(): Promise<string[]>`  
  Fetches CSV attachments and returns saved file paths.

---

*End of Documentation*
