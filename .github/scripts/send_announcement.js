const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const doiUtils = require('./doi_utils');

// Environment variables
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || GMAIL_USER;
const GOOGLE_FORM_BASE_URL = process.env.GOOGLE_FORM_BASE_URL;

// Find the next upcoming presentation within the coming week
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

  // Calculate the date range for the coming 2 weeks
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 14);

  // Load all presentations
  const presentations = utils.loadPresentations();

  // Filter presentations occurring in the next week and sort by date
  const upcomingPresentations = presentations
    .filter(p => {
      const meetingDate = new Date(p.date);
      return meetingDate >= today && meetingDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get the earliest upcoming presentation (the next one to occur)
  const nextPresentation = upcomingPresentations.length > 0 ? upcomingPresentations[0] : null;

  if (nextPresentation) {
    // Check if we already sent a reminder for this date
    if (sentReminders[nextPresentation.date]) {
      console.log(`Already sent reminder for ${nextPresentation.date}`);
      return null;
    }

    // Log that we're going to send a reminder for this date
    sentReminders[nextPresentation.date] = new Date().toISOString();
    fs.writeFileSync(reminderLogPath, JSON.stringify(sentReminders, null, 2));
    return nextPresentation;
  }

  return null;
}

/**
 * Generate the dynamic RSVP form URL by appending the meeting date
 */
function generateRsvpFormUrl(meetingDate) {
  if (!GOOGLE_FORM_BASE_URL) return '';

  // Format date as YYYY-MM-DD using toISOString() and extracting the date part
  const date = new Date(meetingDate);
  const formattedDate = date.toISOString().split('T')[0]; // Gets YYYY-MM-DD part

  // Append the date to the base URL
  return `${GOOGLE_FORM_BASE_URL}${encodeURIComponent(formattedDate)}`;
}

/**
 * Check if a URL is a DOI link
 */
function isDOILink(url) {
  return url && (
    url.startsWith('https://doi.org/') ||
    url.startsWith('http://doi.org/') ||
    url.startsWith('doi.org/') ||
    /^10\.\d{4,}\/[-._;()/:A-Z0-9]+$/i.test(url) // DOI pattern without URL
  );
}

/**
 * Extract DOI from a URL or DOI string
 */
function extractDOI(doiString) {
  if (!doiString) return null;

  // If it's a full DOI URL, extract just the DOI part
  if (doiString.includes('doi.org/')) {
    const parts = doiString.split('doi.org/');
    return parts[1];
  }

  // If it's already just a DOI (e.g., "10.1038/nature09210")
  if (/^10\.\d{4,}\/[-._;()/:A-Z0-9]+$/i.test(doiString)) {
    return doiString;
  }

  return null;
}

/**
 * Generate formatted paper info for email
 * Returns { paperLink, paperTitle, paperShortAPACite }
 */
async function formatPaperInfo(presentation) {
  // Default values using the first paper
  let paperLink = '';
  let paperTitle = '';
  let paperShortAPACite = '';
  let hasMultiplePapers = presentation.links.length > 1;

  // Get the first paper info
  if (presentation.links.length > 0) {
    const firstLink = presentation.links[0];
    paperLink = firstLink.url;

    // If it's a DOI link, get metadata
    if (isDOILink(firstLink.url)) {
      try {
        const doi = extractDOI(firstLink.url);
        if (doi) {
          const metadata = await doiUtils.getAPACitationFromDOI(doi);
          if (metadata && metadata.title) {
            paperTitle = metadata.title;
            // Create short citation (Author, Year) format - now using the authors field with last names only
            paperShortAPACite = metadata.authors && metadata.year ?
              `(${metadata.authors}, ${metadata.year})` : '';
          }
        }
      } catch (error) {
        console.error('Error getting DOI metadata:', error);
      }
    }

    // Use link text as fallback for paper title
    if (!paperTitle) {
      paperTitle = firstLink.text.replace(/^Paper \d+: /i, ''); // Remove "Paper X: " prefix if present
    }
  }

  return {
    paperLink,
    paperTitle,
    paperShortAPACite,
    hasMultiplePapers
  };
}

// Create and send the email
async function sendReminderEmail() {
  const upcomingPresentation = findUpcomingPresentation();

  if (!upcomingPresentation) {
    console.log('No presentation scheduled within the next week.');
    return true; // Not an error case
  }

  console.log(`Found upcoming presentation by ${upcomingPresentation.presenter}`);

  // Get formatted paper info
  const { paperLink, paperTitle, paperShortAPACite, hasMultiplePapers } =
    await formatPaperInfo(upcomingPresentation);

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

  // Generate the dynamic RSVP form URL
  const rsvpFormUrl = generateRsvpFormUrl(upcomingPresentation.date);

  // Include Google Form pre-filled URL if generated
  const googleFormSentence = rsvpFormUrl ?
    `Please <strong><a href="${rsvpFormUrl}">RSVP here</a> by Monday 10am</strong>
     if you plan on attending!` : '';

  // Add additional papers sentence if there are multiple papers
  const additionalPapersText = hasMultiplePapers ?
    ' Additional papers can be found on our website.' : '';

  // Format the date for the subject line (without year)
  const dateForSubject = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const emailSubject = `[compcogsci] Next meeting ${dateForSubject}: ${title} with ${presenter}`;

  // Base font style
  const fontFamily = '"Source Sans 3", "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const emailBody = `
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap');
      body, p, strong, a, span {
        font-family: ${fontFamily};
        font-size: 14px;
      }
    </style>
  </head>
  <body style="font-family: ${fontFamily}; font-size: 14px;">
    <p>Hello all!</p>

    <p>
    The next meeting of the Computational Cognitive Science Reading Group will occur on
     <strong>${formattedDate}</strong>, from 3-5pm PT in Room 358 of Building 420.
     ${googleFormSentence}
     All members of the Stanford research community are welcome to the meeting.
    </p>

    <p>
    This session will be led by <strong>${presenter}</strong> on
     <a href="${paperLink}">"${paperTitle}" ${paperShortAPACite}</a>.
     We ask that everyone attending attempt to read the paper to be discussed before the meeting.
    ${additionalPapersText}
    </p>

    <p>
    More information, including extra paper links, schedule, and future speakers can be found
     on our website viewable <a href="https://compucogsci.github.io">here</a>.
    </p>

    <p>
    Hope to see you there!
    </p>

    <p>Best,<br><br>
    Adani, Jerome, and Sean
    </p>
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
  generateRsvpFormUrl,  // Export for testing
  isDOILink,
  extractDOI,
  formatPaperInfo
};
