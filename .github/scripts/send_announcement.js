const fs = require('fs');
const path = require('path');
const utils = require('./utils');

// Environment variables
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || GMAIL_USER;
const GOOGLE_FORM_BASE_URL = process.env.GOOGLE_FORM_BASE_URL;

// Find presentation that's exactly 8 days away
function findUpcomingPresentation() {
  // Check if we've already sent a reminder for this date (to prevent duplicate emails)
  const reminderLogPath = path.join(process.cwd(), '.github', 'reminder-log.json');
  let sentReminders = {};
  
  if (fs.existsSync(reminderLogPath)) {
    try {
      sentReminders = JSON.parse(fs.readFileSync(reminderLogPath, 'utf8'));
    } catch (e) {
      console.log('Warning: Could not read reminder log, will proceed anyway.');
    }
  }
  
  // Look for a presentation scheduled 8 days from today
  const upcomingPresentation = utils.findMeetingDaysFromNow(8);
  
  if (upcomingPresentation) {
    // Check if we already sent a reminder for this date
    if (sentReminders[upcomingPresentation.date]) {
      console.log(`Already sent reminder for ${upcomingPresentation.date}`);
      return null;
    }
    
    // Log that we're going to send a reminder for this date
    sentReminders[upcomingPresentation.date] = new Date().toISOString();
    fs.writeFileSync(reminderLogPath, JSON.stringify(sentReminders, null, 2));
    return upcomingPresentation;
  }
  
  return null;
}

/**
 * Generate the dynamic RSVP form URL by appending the meeting date
 */
function generateRsvpFormUrl(meetingDate) {
  if (!GOOGLE_FORM_BASE_URL) return '';
  
  // Parse the date and format it as MM/DD/YYYY for the form
  const date = new Date(meetingDate);
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const day = date.getDate();
  const year = date.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  
  // Append the date to the base URL
  // The base URL should end with something like "entry.123456789="
  return `${GOOGLE_FORM_BASE_URL}${encodeURIComponent(formattedDate)}`;
}

// Create and send the email
async function sendReminderEmail() {
  const upcomingPresentation = findUpcomingPresentation();

  if (!upcomingPresentation) {
    console.log('No presentation scheduled for 8 days from now.');
    return true; // Not an error case
  }

  console.log(`Found upcoming presentation by ${upcomingPresentation.presenter}`);

  // Create email content
  const presenter = upcomingPresentation.presenter;
  const title = upcomingPresentation.title;
  const date = new Date(upcomingPresentation.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  // Format links section
  const links = upcomingPresentation.links.map(link => 
    `<li><a href="${link.url}">${link.text}</a></li>`
  ).join('\n');

  // Generate the dynamic RSVP form URL
  const rsvpFormUrl = generateRsvpFormUrl(upcomingPresentation.date);
  
  // Include Google Form pre-filled URL if generated
  const googleFormSection = rsvpFormUrl ? 
    `<p>Please fill out <a href="${rsvpFormUrl}">this form</a> if you plan to attend.</p>` : '';

  const emailSubject = `Reminder: ${presenter} presenting "${title}" on ${formattedDate}`;
  const emailBody = `
  <html>
  <body>
    <p>Hello everyone,</p>
    
    <p>This is a reminder that ${presenter} will be presenting "${title}" next week on ${formattedDate}.</p>
    
    <p>Papers for this presentation:</p>
    <ul>
      ${links}
    </ul>
    
    ${googleFormSection}
    
    <p>Please read the paper(s) before the meeting. If you have any questions, please contact ${presenter} directly.</p>
    
    <p>Best regards,<br>
    Stanford Computational Cognitive Science Reading Group</p>
  </body>
  </html>
  `;

  // Send the email using the utility function (with isHtml=true)
  return await utils.sendEmail(GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFICATION_EMAIL, emailSubject, emailBody, true);
}

// Run the main function
async function run() {
  try {
    const success = await sendReminderEmail();
    if (!success) {
      console.error('Failed to send email reminder');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in send_announcement script:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = {
  findUpcomingPresentation,
  sendReminderEmail,
  generateRsvpFormUrl  // Export for testing
};
