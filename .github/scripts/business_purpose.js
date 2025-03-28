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
    subject: `Business Purpose: ${meeting.title} (${formattedDate})`,
    body: `
Dear Reimbursement Team,

I am writing to provide the business purpose for the CompuCogSci reading group meeting held on ${formattedDate}. 

The meeting was attended by ${formattedNamesList}. During this meeting, we discussed "${meeting.title}" presented by ${meeting.presenter}.

The meeting's academic purpose was to discuss recent research in computational cognitive science, specifically focusing on ${meeting.summary || "topics related to cognitive modeling and computational approaches to understanding the mind"}.

Please let me know if you need any additional information for the reimbursement process.

Thank you,
[Your Name]
    `.trim()
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
    console.log('Body:');
    console.log(emailContent.body);
    
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
