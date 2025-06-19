const core = require('@actions/core');
const utils = require('./utils');

// Improved logging for credentials parsing
let CREDENTIALS;
try {
  if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is missing or empty');
  }

  // Log credential length for debugging (not the actual content)
  console.log(`GOOGLE_SHEETS_CREDENTIALS length: ${process.env.GOOGLE_SHEETS_CREDENTIALS.length} characters`);

  // Add extra check to see if the credentials string starts with { and ends with }
  const credStr = process.env.GOOGLE_SHEETS_CREDENTIALS.trim();
  if (!credStr.startsWith('{') || !credStr.endsWith('}')) {
    console.warn('Warning: GOOGLE_SHEETS_CREDENTIALS does not appear to be a valid JSON object');
    console.log(`First few characters: ${credStr.substring(0, 5)}...`);
    console.log(`Last few characters: ...${credStr.substring(credStr.length - 5)}`);
  }

  CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  console.log('Successfully parsed GOOGLE_SHEETS_CREDENTIALS');
} catch (error) {
  console.error('Failed to parse GOOGLE_SHEETS_CREDENTIALS:', error.message);
  core.setFailed(`Error parsing credentials: ${error.message}`);
  process.exit(1);
}

const SHEET_ID = process.env.SHEET_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFICATION_EMAILS = process.env.NOTIFICATION_EMAILS || process.env.NOTIFICATION_EMAIL || GMAIL_USER;

async function getUniqueRsvpCount() {
  try {
    // Find the upcoming meeting
    const upcomingMeeting = utils.findUpcomingMeeting();

    if (!upcomingMeeting) {
      console.log('No upcoming meetings found.');
      return null;
    }

    console.log(`Processing RSVPs for meeting on ${upcomingMeeting.date}: ${upcomingMeeting.title}`);

    // Get a Google Sheets client
    const sheets = utils.getGoogleSheetsClient(CREDENTIALS);
    console.log('Successfully created Google Sheets client');

    // Get RSVP count from the latest date in the form
    const rsvpResult = await utils.getLatestRsvpCount(CREDENTIALS, SHEET_ID);

    if (!rsvpResult) {
      console.log('No RSVP data found.');
      return null;
    }

    // Get dietary restrictions for the upcoming meeting
    const dietaryRestrictions = await utils.getDietaryRestrictionsForMeeting(
      CREDENTIALS,
      SHEET_ID,
      upcomingMeeting.date
    );

    return {
      meeting: upcomingMeeting,
      count: rsvpResult.count,
      date: rsvpResult.date,
      dietaryRestrictions: dietaryRestrictions
    };
  } catch (error) {
    console.error('Error fetching RSVP count:', error);
    return null;
  }
}

async function sendRsvpCountEmail(result) {
  const emailSubject = `RSVP Count for ${result.meeting.title} (${result.meeting.date})`;

  // Format dietary restrictions
  let dietaryRestrictionsText = 'None reported';
  if (result.dietaryRestrictions && result.dietaryRestrictions.length > 0) {
    dietaryRestrictionsText = result.dietaryRestrictions.map(item => `- ${item}`).join('\n    ');
  }

  const emailContent = `
    Meeting: ${result.meeting.title}
    Date: ${result.meeting.date}
    Presenter: ${result.meeting.presenter}

    Current RSVP count: ${result.count} unique attendees

    Dietary Restrictions:
    ${dietaryRestrictionsText}

    RSVP date in spreadsheet: ${result.date}
  `;

  return await utils.sendEmail(GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFICATION_EMAILS, emailSubject, emailContent);
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
      if (GMAIL_USER && GMAIL_APP_PASSWORD) {
        try {
          await sendRsvpCountEmail(result);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          core.setOutput('email_failed', 'true');
        }
      } else {
        console.log('Email credentials not provided');
        core.setOutput('email_failed', 'true');
      }

      console.log(`RSVP Count: ${result.count}`);
    } else {
      core.setOutput('rsvp_count', 0);
      console.log('No RSVP data to process');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    core.setOutput('email_failed', 'true');
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
