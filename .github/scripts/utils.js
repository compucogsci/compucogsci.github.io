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
 * Send an email using Gmail
 */
async function sendEmail(gmailUser, gmailAppPassword, recipient, subject, content, isHtml = false) {
  try {
    const transporter = createGmailTransporter(gmailUser, gmailAppPassword);
    
    const mailOptions = {
      from: gmailUser,
      to: recipient || gmailUser,
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
    
    // Get the latest RSVP date
    const meetingDates = rows.slice(1)
      .map(row => row[dateColIndex])
      .filter(date => date); // Filter out empty dates
    
    const latestDate = meetingDates.reduce((latest, current) => {
      return latest >= current ? latest : current;
    }, '');
    
    if (!latestDate) {
      console.log('No RSVP dates found in the spreadsheet.');
      return null;
    }
    
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
      count: count,
      date: latestDate,
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
  getLatestRsvpCount,
  formatNamesList
};
