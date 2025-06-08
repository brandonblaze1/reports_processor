require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { log } = require('./utils/logger');

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

auth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth });

// Recursive search for .csv parts
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

      // Ensure directory exists
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      const filePath = path.join(folder, filename);
      fs.writeFileSync(filePath, Buffer.from(attachment.data.data, 'base64'));

      savedFiles.push(filePath);
      log(`✅ Saved attachment: ${filename}`);
    }

    // Optional: mark email as read
    // await gmail.users.messages.modify({
    //   userId: 'me',
    //   id: message.id,
    //   requestBody: { removeLabelIds: ['UNREAD'] },
    // });
  }

  return savedFiles;
}

module.exports = { fetchAttachments };
