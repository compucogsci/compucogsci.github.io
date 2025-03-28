const core = require('@actions/core');
const axios = require('axios');
const utils = require('./utils');

// Read credentials from environment variables or GitHub secrets
const GOOGLE_SHEETS_CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
const SHEET_ID = process.env.SHEET_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || GMAIL_USER;
const STANFORD_API_KEY = process.env.STANFORD_API_KEY;
const STANFORD_API_SECRET = process.env.STANFORD_API_SECRET;

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

// Main function to run the business purpose workflow
async function run() {
  try {
    // Get the most recent meeting that has occurred
    const recentMeeting = utils.findMostRecentMeeting();
    
    if (!recentMeeting) {
      console.log('No recent meetings found to process.');
      return;
    }
    
    // Get unique emails for the meeting
    const emails = await utils.getUniqueEmailsForMeeting(
      GOOGLE_SHEETS_CREDENTIALS, 
      SHEET_ID, 
      recentMeeting.date
    );
    
    if (emails.length === 0) {
      console.log('No attendees found for the meeting.');
      return;
    }
    
    // Look up user information
    const users = await lookupUsersByEmail(emails);
    
    // Format names list with proper commas
    const names = users.map(user => user.name);
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
    core.setOutput('attendee_count', emails.length);
    
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
  lookupUsersByEmail,
  generateBusinessPurposeEmail,
  run
};
