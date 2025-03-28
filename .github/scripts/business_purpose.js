const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Read credentials from environment variables or GitHub secrets
const GOOGLE_SHEETS_CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
const SHEET_ID = process.env.SHEET_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
const STANFORD_API_KEY = process.env.STANFORD_API_KEY;
const STANFORD_API_SECRET = process.env.STANFORD_API_SECRET;

/**
 * Find the most recent meeting that has already occurred
 */
async function getMostRecentMeeting() {
  const presentationsPath = path.join(process.cwd(), 'presentations.json');
  const presentations = JSON.parse(fs.readFileSync(presentationsPath, 'utf8'));
  
  const today = new Date();
  
  // Find the most recent meeting in the past (including today)
  const pastMeetings = presentations
    .filter(p => {
      const meetingDate = new Date(p.date);
      meetingDate.setHours(23, 59, 59); // End of meeting day
      return meetingDate <= today;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (pastMeetings.length === 0) {
    console.log('No past meetings found.');
    return null;
  }
  
  const mostRecent = pastMeetings[0];
  console.log(`Found most recent meeting: ${mostRecent.title} on ${mostRecent.date}`);
  return mostRecent;
}

/**
 * Get unique email addresses from the Google Sheet for a specific meeting date
 */
async function getUniqueEmailsForMeeting(meetingDate) {
  try {
    // Set up auth with Google Sheets
    const auth = new google.auth.JWT(
      GOOGLE_SHEETS_CREDENTIALS.client_email,
      null,
      GOOGLE_SHEETS_CREDENTIALS.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'A:Z', // Fetch all columns
    });
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('No data found in the spreadsheet.');
      return [];
    }
    
    // Find column indices
    const headers = rows[0];
    const emailColIndex = headers.findIndex(col => col === 'Email Address');
    const dateColIndex = headers.findIndex(col => col === 'You are RSVP\'ing for our meeting on:');
    
    if (emailColIndex === -1 || dateColIndex === -1) {
      console.error('Could not find required columns in spreadsheet');
      return [];
    }
    
    // Get unique emails for the specified meeting date
    const uniqueEmails = new Set();
    
    rows.slice(1).forEach(row => {
      if (row[dateColIndex] === meetingDate && row[emailColIndex]) {
        uniqueEmails.add(row[emailColIndex].toLowerCase().trim());
      }
    });
    
    console.log(`Found ${uniqueEmails.size} unique emails for meeting date: ${meetingDate}`);
    return Array.from(uniqueEmails);
  } catch (error) {
    console.error('Error fetching emails from spreadsheet:', error);
    return [];
  }
}

/**
 * Look up Stanford user information by email
 */
async function lookupUsersByEmail(emails) {
  try {
    const users = [];
    
    for (const email of emails) {
      try {
        // Stanford API requires authentication
        const response = await axios.get(`https://api.stanford.edu/v1/accounts/${email}`, {
          headers: {
            'Accept': 'application/json',
            'x-api-key': STANFORD_API_KEY,
            'Authorization': `Bearer ${STANFORD_API_SECRET}`
          }
        });
        
        if (response.data && response.data.name) {
          users.push({
            email: email,
            name: response.data.name
          });
        } else {
          console.log(`No user data found for email: ${email}`);
          // Use email as fallback
          users.push({
            email: email,
            name: email.split('@')[0] // Use the part before @ as name
          });
        }
      } catch (error) {
        console.log(`Error looking up user for email ${email}:`, error.message);
        // Use email as fallback
        users.push({
          email: email,
          name: email.split('@')[0] // Use the part before @ as name
        });
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return users;
  } catch (error) {
    console.error('Error looking up users:', error);
    // Return emails as fallback
    return emails.map(email => ({
      email: email,
      name: email.split('@')[0] // Use the part before @ as name
    }));
  }
}

/**
 * Format names with proper comma separation and Oxford comma
 */
function formatNamesList(users) {
  const names = users.map(user => user.name);
  
  if (names.length === 0) {
    return '';
  } else if (names.length === 1) {
    return names[0];
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  } else {
    const lastIndex = names.length - 1;
    return `${names.slice(0, lastIndex).join(', ')}, and ${names[lastIndex]}`;
  }
}

/**
 * Generate the business purpose draft email
 */
function generateBusinessPurposeEmail(meeting, formattedNamesList) {
  return {
    subject: `Business Purpose: ${meeting.title} (${meeting.date})`,
    body: `
Dear Reimbursement Team,

I am writing to provide the business purpose for the CompuCogSci reading group meeting held on ${meeting.date}. 

The meeting was attended by ${formattedNamesList}. During this meeting, we discussed "${meeting.title}" presented by ${meeting.presenter}.

The meeting's academic purpose was to discuss recent research in computational cognitive science, specifically focusing on ${meeting.summary || "topics related to cognitive modeling and computational approaches to understanding the mind"}.

Please let me know if you need any additional information for the reimbursement process.

Thank you,
[Your Name]
    `.trim()
  };
}

/**
 * Send email notification
 */
async function sendEmail(emailContent) {
  try {
    // Create a Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
    
    // Email content
    const mailOptions = {
      from: GMAIL_USER,
      to: NOTIFICATION_EMAIL,
      subject: emailContent.subject,
      text: emailContent.body,
    };
    
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log('Business purpose email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Main function to run the business purpose workflow
async function run() {
  try {
    // Get the most recent meeting that has occurred
    const recentMeeting = await getMostRecentMeeting();
    
    if (!recentMeeting) {
      console.log('No recent meetings found to process.');
      return;
    }
    
    // Get unique emails for the meeting
    const emails = await getUniqueEmailsForMeeting(recentMeeting.date);
    
    if (emails.length === 0) {
      console.log('No attendees found for the meeting.');
      return;
    }
    
    // Look up user information
    const users = await lookupUsersByEmail(emails);
    
    // Format names list with proper commas
    const formattedNamesList = formatNamesList(users);
    
    // Generate the business purpose email content
    const emailContent = generateBusinessPurposeEmail(recentMeeting, formattedNamesList);
    
    console.log('Generated business purpose email:');
    console.log(`Subject: ${emailContent.subject}`);
    console.log('Body:');
    console.log(emailContent.body);
    
    // Set outputs for GitHub Actions
    core.setOutput('meeting_title', recentMeeting.title);
    core.setOutput('meeting_date', recentMeeting.date);
    core.setOutput('attendee_count', emails.length);
    
    // Send email with Gmail
    const success = await sendEmail(emailContent);
    
    if (!success) {
      core.setOutput('email_failed', 'true');
      core.setFailed('Failed to send email');
    }
  } catch (error) {
    core.setFailed(`Error in business purpose workflow: ${error.message}`);
    core.setOutput('email_failed', 'true');
    console.error(error);
  }
}

// Run if called directly from GitHub Actions
if (require.main === module) {
  run();
}

module.exports = {
  getMostRecentMeeting,
  getUniqueEmailsForMeeting,
  lookupUsersByEmail,
  formatNamesList,
  generateBusinessPurposeEmail,
  run
};
