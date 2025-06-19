const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

/**
 * Load presentations data from the JSON file
 */
function loadPresentations() {
  const presentationsPath = path.join(process.cwd(), 'presentations.json');
  try {
    const presentations = JSON.parse(fs.readFileSync(presentationsPath, 'utf8'));
    return presentations;
  } catch (error) {
    console.error('Error reading or parsing presentations data:', error);
    return [];
  }
}

/**
 * Find the upcoming meeting (closest to current date)
 */
function findUpcomingMeeting() {
  const presentations = loadPresentations();
  const today = new Date();

  const upcomingMeetings = presentations
    .filter(p => new Date(p.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return upcomingMeetings.length > 0 ? upcomingMeetings[0] : null;
}

/**
 * Find the meeting scheduled for a specific date
 */
function findMeetingByDate(targetDate) {
  const presentations = loadPresentations();
  const targetDateStr = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  return presentations.find(p => p.date === targetDateStr);
}

/**
 * Find the most recent meeting that has already occurred
 */
function findMostRecentMeeting() {
  const presentations = loadPresentations();
  const today = new Date();

  const pastMeetings = presentations
    .filter(p => {
      const meetingDate = new Date(p.date);
      meetingDate.setHours(23, 59, 59); // End of meeting day
      return meetingDate <= today;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return pastMeetings.length > 0 ? pastMeetings[0] : null;
}

/**
 * Find a meeting scheduled for exactly N days from now
 */
function findMeetingDaysFromNow(days) {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + days); // N days from now

  return findMeetingByDate(targetDate);
}

/**
 * Create a Gmail transporter for sending emails
 */
function createGmailTransporter(gmailUser, gmailAppPassword) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    }
  });
}

/**
 * Send an email using Gmail to multiple recipients
 */
async function sendEmail(gmailUser, gmailAppPassword, recipients, subject, content, isHtml = false) {
  try {
    const transporter = createGmailTransporter(gmailUser, gmailAppPassword);

    // Handle multiple recipients - split by comma and trim whitespace
    let recipientList;
    if (typeof recipients === 'string') {
      recipientList = recipients.split(',').map(email => email.trim()).filter(email => email.length > 0);
    } else if (Array.isArray(recipients)) {
      recipientList = recipients;
    } else {
      recipientList = [gmailUser]; // Fallback to sender
    }

    // If no valid recipients, fallback to sender
    if (recipientList.length === 0) {
      recipientList = [gmailUser];
    }

    console.log(`Sending email to ${recipientList.length} recipient(s): ${recipientList.join(', ')}`);

    const mailOptions = {
      from: gmailUser,
      to: recipientList.join(', '),
      subject: subject,
    };

    // Set either html or text content based on isHtml flag
    if (isHtml) {
      mailOptions.html = content;
    } else {
      mailOptions.text = content;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Set up Google Sheets authentication and get a sheets client
 */
function getGoogleSheetsClient(credentials) {
  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  return google.sheets({ version: 'v4', auth });
}

/**
 * Parse and normalize various date formats to ISO format (YYYY-MM-DD)
 */
function normalizeDate(dateString) {
  if (!dateString) return null;

  // Handle MM/DD/YYYY format (e.g., 4/1/2025)
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    // Ensure we have exactly 3 parts
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Try to parse as a JavaScript Date and convert to ISO format
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error(`Failed to parse date: ${dateString}`);
  }

  return dateString; // Return original if we can't parse it
}

/**
 * Compare if two date strings represent the same date, handling multiple formats
 */
function areDatesEqual(date1, date2) {
  const normalizedDate1 = normalizeDate(date1);
  const normalizedDate2 = normalizeDate(date2);

  return normalizedDate1 === normalizedDate2;
}

/**
 * Get unique emails from a Google Sheet for a specific meeting date
 */
async function getUniqueEmailsForMeeting(credentials, sheetId, meetingDate) {
  try {
    const sheets = getGoogleSheetsClient(credentials);

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
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
    const normalizedTargetDate = normalizeDate(meetingDate);

    rows.slice(1).forEach(row => {
      if (row[dateColIndex] && row[emailColIndex]) {
        const normalizedRowDate = normalizeDate(row[dateColIndex]);
        if (normalizedRowDate === normalizedTargetDate) {
          uniqueEmails.add(row[emailColIndex].toLowerCase().trim());
        }
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
 * Get unique attendees with their names from a Google Sheet for a specific meeting date
 */
async function getAttendeesForMeeting(credentials, sheetId, meetingDate) {
  try {
    const sheets = getGoogleSheetsClient(credentials);

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
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
    const firstNameColIndex = headers.findIndex(col => col === 'First name:');
    const surnameColIndex = headers.findIndex(col => col === 'Surname:');

    if (emailColIndex === -1 || dateColIndex === -1) {
      console.error('Could not find required columns in spreadsheet');
      return [];
    }

    // Track unique attendees by email
    const uniqueAttendees = new Map();
    const normalizedTargetDate = normalizeDate(meetingDate);

    rows.slice(1).forEach(row => {
      if (row[dateColIndex] && row[emailColIndex]) {
        const normalizedRowDate = normalizeDate(row[dateColIndex]);
        if (normalizedRowDate === normalizedTargetDate) {
          const email = row[emailColIndex].toLowerCase().trim();

          // Only add if not already in the map
          if (!uniqueAttendees.has(email)) {
            const firstName = (firstNameColIndex !== -1 && row[firstNameColIndex]) ? row[firstNameColIndex].trim() : '';
            const surname = (surnameColIndex !== -1 && row[surnameColIndex]) ? row[surnameColIndex].trim() : '';

            let name;
            if (firstName && surname) {
              name = `${firstName} ${surname}`;
            } else if (firstName) {
              name = firstName;
            } else if (surname) {
              name = surname;
            } else {
              // Fallback to email username
              name = email.split('@')[0];
            }

            uniqueAttendees.set(email, { email, name });
          }
        }
      }
    });

    const attendees = Array.from(uniqueAttendees.values());
    console.log(`Found ${attendees.length} unique attendees for meeting date: ${meetingDate}`);
    return attendees;
  } catch (error) {
    console.error('Error fetching attendees from spreadsheet:', error);
    return [];
  }
}

/**
 * Get the latest meeting date from the RSVP form
 * and count unique emails for that date
 */
async function getLatestRsvpCount(credentials, sheetId) {
  try {
    const sheets = getGoogleSheetsClient(credentials);

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:Z', // Fetch all columns
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

    // Get the latest RSVP date, comparing dates after normalizing
    let latestNormalizedDate = '';
    let latestOriginalDate = '';

    rows.slice(1).forEach(row => {
      if (row[dateColIndex]) {
        const normalizedDate = normalizeDate(row[dateColIndex]);
        if (!latestNormalizedDate || normalizedDate > latestNormalizedDate) {
          latestNormalizedDate = normalizedDate;
          latestOriginalDate = row[dateColIndex];
        }
      }
    });

    if (!latestOriginalDate) {
      console.log('No RSVP dates found in the spreadsheet.');
      return null;
    }

    console.log(`Latest RSVP date: ${latestOriginalDate} (normalized: ${latestNormalizedDate})`);

    // Count unique emails for the latest date
    const uniqueEmails = new Set();

    rows.slice(1).forEach(row => {
      if (row[dateColIndex] && row[emailColIndex]) {
        const normalizedRowDate = normalizeDate(row[dateColIndex]);
        if (normalizedRowDate === latestNormalizedDate) {
          uniqueEmails.add(row[emailColIndex].toLowerCase().trim());
        }
      }
    });

    const count = uniqueEmails.size;
    console.log(`Found ${count} unique RSVPs for the latest meeting date`);

    return {
      count: count,
      date: latestOriginalDate,
      normalizedDate: latestNormalizedDate,
      emails: Array.from(uniqueEmails)
    };
  } catch (error) {
    console.error('Error fetching RSVP count:', error);
    return null;
  }
}

/**
 * Format a list of names with proper comma separation including Oxford comma
 */
function formatNamesList(names) {
  if (!Array.isArray(names)) return '';

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
 * Get unique dietary restrictions for a specific meeting date
 */
async function getDietaryRestrictionsForMeeting(credentials, sheetId, meetingDate) {
  try {
    const sheets = getGoogleSheetsClient(credentials);

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:Z', // Fetch all columns
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('No data found in the spreadsheet.');
      return [];
    }

    // Find column indices
    const headers = rows[0];
    const dateColIndex = headers.findIndex(col => col === 'You are RSVP\'ing for our meeting on:');
    const dietaryColIndex = headers.findIndex(col => col === 'report dietary restrictions here:');

    if (dateColIndex === -1 || dietaryColIndex === -1) {
      console.error('Could not find required columns in spreadsheet');
      return [];
    }

    // Get unique dietary restrictions for the specified meeting date
    const uniqueDietaryRestrictions = new Set();
    const normalizedTargetDate = normalizeDate(meetingDate);

    rows.slice(1).forEach(row => {
      if (row[dateColIndex] && row[dietaryColIndex] && row[dietaryColIndex].trim()) {
        const normalizedRowDate = normalizeDate(row[dateColIndex]);
        if (normalizedRowDate === normalizedTargetDate) {
          uniqueDietaryRestrictions.add(row[dietaryColIndex].trim());
        }
      }
    });

    console.log(`Found ${uniqueDietaryRestrictions.size} unique dietary restrictions for meeting date: ${meetingDate}`);
    return Array.from(uniqueDietaryRestrictions);
  } catch (error) {
    console.error('Error fetching dietary restrictions from spreadsheet:', error);
    return [];
  }
}

module.exports = {
  loadPresentations,
  findUpcomingMeeting,
  findMeetingByDate,
  findMostRecentMeeting,
  findMeetingDaysFromNow,
  createGmailTransporter,
  sendEmail,
  getGoogleSheetsClient,
  getUniqueEmailsForMeeting,
  getAttendeesForMeeting,
  getLatestRsvpCount,
  formatNamesList,
  normalizeDate,
  areDatesEqual,
  getDietaryRestrictionsForMeeting,
};
