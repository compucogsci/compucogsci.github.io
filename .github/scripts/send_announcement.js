const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');

// Function to get presentations data from JSON file
function getPresentation() {
  // Read the presentations JSON file
  const presentationsFilePath = path.join(process.cwd(), 'presentations.json');
  try {
    const presentationsContent = fs.readFileSync(presentationsFilePath, 'utf8');
    const presentations = JSON.parse(presentationsContent);
    return presentations;
  } catch (error) {
    console.error('Error reading or parsing presentations data:', error);
    process.exit(1);
  }
}

// Find presentation that's exactly 7 days away
function findUpcomingPresentation() {
  const presentations = getPresentation();
  
  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + 7); // 7 days from now

  const targetDateStr = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  
  console.log(`Looking for presentation scheduled on: ${targetDateStr}`);
  
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
  
  if (sentReminders[targetDateStr]) {
    console.log(`Already sent reminder for ${targetDateStr}`);
    return null;
  }
  
  const upcomingPresentation = presentations.find(p => p.date === targetDateStr);
  
  if (upcomingPresentation) {
    // Log that we're going to send a reminder for this date
    sentReminders[targetDateStr] = new Date().toISOString();
    fs.writeFileSync(reminderLogPath, JSON.stringify(sentReminders, null, 2));
  }
  
  return upcomingPresentation;
}

// Create and send the email
async function sendReminderEmail() {
  const upcomingPresentation = findUpcomingPresentation();

  if (!upcomingPresentation) {
    console.log('No presentation scheduled for 7 days from now.');
    return;
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

  // Include Google Form pre-filled URL if provided
  const googleFormSection = process.env.GOOGLE_FORM_URL ? 
    `<p>Please fill out <a href="${process.env.GOOGLE_FORM_URL}">this form</a> if you plan to attend.</p>` : '';

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

  // Replace the Gmail transporter with Microsoft Exchange/Outlook configuration
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',  // Microsoft Exchange Online SMTP server
    port: 587,                   // Standard secure SMTP port
    secure: false,               // For port 587, secure should be false
    auth: {
      user: process.env.EMAIL_USER,  // Your Stanford email address
      pass: process.env.EMAIL_PASS,  // Your email password or app password
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false  // Sometimes needed for institutional servers
    }
  });

  // Send the email
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAIL,
      subject: emailSubject,
      html: emailBody,
    });
    
    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the main function
sendReminderEmail();
