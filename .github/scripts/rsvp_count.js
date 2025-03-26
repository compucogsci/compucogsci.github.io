const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const nodemailer = require('nodemailer');

// Read credentials from environment variables or GitHub secrets
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
const SHEET_ID = process.env.SHEET_ID;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;

async function getUniqueRsvpCount() {
  try {
    // Load presentations data to get current meeting date
    const presentationsPath = path.join(process.cwd(), 'presentations.json');
    const presentations = JSON.parse(fs.readFileSync(presentationsPath, 'utf8'));
    
    // Find the upcoming meeting (closest to current date)
    const today = new Date();
    const upcomingMeeting = presentations
      .filter(p => new Date(p.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    
    if (!upcomingMeeting) {
      console.log('No upcoming meetings found.');
      return null;
    }
    
    console.log(`Processing RSVPs for meeting on ${upcomingMeeting.date}: ${upcomingMeeting.title}`);
    
    // Set up auth with Google Sheets
    const auth = new google.auth.JWT(
      CREDENTIALS.client_email,
      null,
      CREDENTIALS.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'A:Z', // Fetch all columns to make sure we get the RSVP date and email columns
    });
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('No data found in the spreadsheet.');
      return null;
    }
    
    // Find column indices
    const headers = rows[0];
    const emailColIndex = headers.findIndex(col => col === 'Email Address');
    const dateColIndex = headers.findIndex(col => col === 'You are RSVP\'ing for our meeting on:');
    
    if (emailColIndex === -1 || dateColIndex === -1) {
      console.error('Could not find required columns in spreadsheet');
      return null;
    }
    
    // Get the latest RSVP date
    const meetingDates = rows.slice(1)
      .map(row => row[dateColIndex])
      .filter(date => date); // Filter out empty dates
    
    const latestDate = meetingDates.reduce((latest, current) => {
      return latest >= current ? latest : current;
    }, '');
    
    console.log(`Latest RSVP date: ${latestDate}`);
    
    // Count unique emails for the latest date
    const uniqueEmails = new Set();
    
    rows.slice(1).forEach(row => {
      if (row[dateColIndex] === latestDate && row[emailColIndex]) {
        uniqueEmails.add(row[emailColIndex].toLowerCase().trim());
      }
    });
    
    const count = uniqueEmails.size;
    console.log(`Found ${count} unique RSVPs for the latest meeting date`);
    
    return {
      meeting: upcomingMeeting,
      count: count,
      date: latestDate
    };
  } catch (error) {
    console.error('Error fetching RSVP count:', error);
    return null;
  }
}

async function sendEmail(result) {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
  
  // Email content
  const mailOptions = {
    from: EMAIL_USER,
    to: NOTIFICATION_EMAIL,
    subject: `RSVP Count for ${result.meeting.title} (${result.meeting.date})`,
    text: `
      Meeting: ${result.meeting.title}
      Date: ${result.meeting.date}
      Presenter: ${result.meeting.presenter}
      
      Current RSVP count: ${result.count} unique attendees
      
      RSVP date in spreadsheet: ${result.date}
    `,
  };
  
  // Send the email
  await transporter.sendMail(mailOptions);
  console.log('RSVP count notification email sent successfully');
}

// Export for GitHub Actions
async function run() {
  try {
    const result = await getUniqueRsvpCount();
    
    if (result) {
      // Set output for GitHub Actions
      core.setOutput('rsvp_count', result.count);
      core.setOutput('meeting_title', result.meeting.title);
      core.setOutput('meeting_date', result.meeting.date);
      
      // Send email notification
      if (EMAIL_USER && EMAIL_PASSWORD && NOTIFICATION_EMAIL) {
        await sendEmail(result);
      }
      
      console.log(`RSVP Count: ${result.count}`);
    } else {
      core.setOutput('rsvp_count', 0);
      console.log('No RSVP data to process');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

// Run if called directly (useful for GitHub Actions)
if (require.main === module) {
  run();
}

// Export for testing or importing elsewhere
module.exports = {
  getUniqueRsvpCount,
  run
};
