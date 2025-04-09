const core = require('@actions/core');
const utils = require('./utils');

// Read credentials from environment variables or GitHub secrets
const GOOGLE_SHEETS_CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
const SHEET_ID = process.env.SHEET_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || GMAIL_USER;

/**
 * Generate the business purpose draft email
 */
function generateBusinessPurposeEmail(meeting, formattedNamesList) {
  // Format the date more formally for the business purpose email
  const meetingDate = new Date(meeting.date);
  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    subject: `CompCogSci Journal Club reimbursement (${formattedDate})`,
    body: `
<html>
<body>
  <p>Hi,</p>

  <p>
  Could you help me get our latest food order ($AMOUNT) for CompCogSci Reading Group reimbursed?
  We'd like to use this account: ACCOUNT.
  The receipt is in the forwarded email below.
  </p>

  <p>
  Here is a list of the attendees:
  ${formattedNamesList}
  </p>

  <p>
  Here is a draft business purpose (let me know if this is helpful):
  </p>

  <p>
  <strong>WHO:</strong> Sean Anderson, grad student in the department of Psychology.
  <strong>WHAT:</strong> Dinner for ${names.length} PhD students and research staff in the Department of Psychology Computational Cognitive Science Reading Group.
  <strong>WHERE:</strong> Dominos.
  <strong>WHEN:</strong> ${formattedDate}.
  <strong>WHY:</strong> Reviewing and discussing past and present research in cognitive science in service of ongoing and future research projects.
  Participants: ${formattedNamesList}.
  PTA ACCOUNT will be used for this expense.
  </p>

  <p>
  Thank you,
  <br><br>
  Sean Anderson
  </p>
</body>
</html>`.trim()
  };
}

// Main function to run the business purpose workflow
async function run() {
  try {
    // Get the most recent meeting that has occurred
    const recentMeeting = utils.findMostRecentMeeting();
    
    if (!recentMeeting) {
      console.log('No recent meetings found to process.');
      return;
    }
    
    // Get attendees from the Google Sheet
    const attendees = await utils.getAttendeesForMeeting(
      GOOGLE_SHEETS_CREDENTIALS, 
      SHEET_ID, 
      recentMeeting.date
    );
    
    if (attendees.length === 0) {
      console.log('No attendees found for the meeting.');
      return;
    }
    
    // Extract names from attendees
    const names = attendees.map(attendee => attendee.name);
    const formattedNamesList = utils.formatNamesList(names);
    
    // Generate the business purpose email content
    const emailContent = generateBusinessPurposeEmail(recentMeeting, formattedNamesList);
    
    console.log('Generated business purpose email:');
    console.log(`Subject: ${emailContent.subject}`);
    //console.log('Body:');
    //console.log(emailContent.body);
    
    // Set outputs for GitHub Actions
    core.setOutput('meeting_title', recentMeeting.title);
    core.setOutput('meeting_date', recentMeeting.date);
    core.setOutput('attendee_count', attendees.length);
    
    // Send email with Gmail
    const success = await utils.sendEmail(
      GMAIL_USER,
      GMAIL_APP_PASSWORD,
      NOTIFICATION_EMAIL,
      emailContent.subject,
      emailContent.body
    );
    
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
  generateBusinessPurposeEmail,
  run
};
