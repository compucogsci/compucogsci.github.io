# CompuCogSci GitHub Workflows

This directory contains GitHub Actions workflows that automate various tasks for the CompuCogSci reading group.

## Available Workflows

### 1. RSVP Count (`rsvp_count.yml`)

Automatically counts unique RSVP submissions for upcoming meetings.

**Functionality:**
- Runs every Monday at 11:30 AM PT
- Checks if there's a meeting scheduled for the current week in `presentations.json`
- If a meeting is found, it counts unique email addresses from the Google Sheet RSVP form
- Only counts emails for the most recent meeting date in the RSVP form
- Notification methods:
  1. Email notification via Gmail
  2. GitHub issue (only created once if email notification fails)

**Required Secrets:**
- `GOOGLE_SHEETS_CREDENTIALS`: JSON string of service account credentials
- `SHEET_ID`: ID of your Google Sheet containing RSVPs
- `GMAIL_USER`: Gmail address to send notifications from
- `GMAIL_APP_PASSWORD`: App password for Gmail
- `NOTIFICATION_EMAIL`: Email to receive notifications (optional, defaults to GMAIL_USER)

**Files:**
- `.github/scripts/rsvp_count.js`: Main script for counting RSVPs
- `.github/workflows/rsvp_count.yml`: Workflow definition file

### 2. Presentation Announcements (`announcement.yml`)

Sends announcement emails for upcoming reading group presentations.

**Functionality:**
- Runs every Monday at 10:00 AM PDT (17:00 UTC)
- Checks for upcoming presentations in `presentations.json`
- Sends an announcement email with presentation details
- Dynamically generates the RSVP form link by appending the meeting date to the base URL

**Required Secrets:**
- `GMAIL_USER`: Gmail address to send from
- `GMAIL_APP_PASSWORD`: App password for Gmail
- `NOTIFICATION_EMAIL`: Email address to send announcements to (optional, defaults to GMAIL_USER)
- `GOOGLE_FORM_BASE_URL`: Base URL for the RSVP Google Form (will have the meeting date appended in YYYY-MM-DD format)

**Files:**
- `.github/scripts/send_announcement.js`: Script that sends announcement emails
- `.github/workflows/announcement.yml`: Workflow definition file

### 3. Business Purpose Generator (`business_purpose.yml`)

Automatically generates a business purpose email for reimbursement processes after each meeting.

**Functionality:**
- Runs every Wednesday at 10:00 AM PT
- Identifies the most recent meeting that has occurred
- Fetches unique email addresses from the Google Sheet for that meeting date
- Looks up attendee names using the Stanford Account API
- Creates a properly formatted list of attendees with Oxford comma
- Sends you an email with the business purpose template

**Required Secrets:**
- `GOOGLE_SHEETS_CREDENTIALS`: JSON string of service account credentials
- `SHEET_ID`: ID of your Google Sheet containing RSVPs
- `GMAIL_USER`: Gmail address to send from
- `GMAIL_APP_PASSWORD`: App password for Gmail
- `NOTIFICATION_EMAIL`: Email to receive the business purpose email (optional, defaults to GMAIL_USER)
- `STANFORD_API_KEY`: API key for Stanford Account API
- `STANFORD_API_SECRET`: Secret for Stanford Account API

**Files:**
- `.github/scripts/business_purpose.js`: Script for generating the business purpose emails
- `.github/workflows/business_purpose.yml`: Workflow definition file

## Setup Instructions

### Google API Setup for RSVP Counting and Business Purpose

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Sheets API
4. Create a service account
5. Download JSON credentials
6. Share your Google Sheet with the service account email
7. Add the JSON content as a GitHub secret named `GOOGLE_SHEETS_CREDENTIALS`

### Gmail Setup for Notifications

1. Create or use an existing Gmail account for sending notifications
2. Enable 2-Step Verification on your Gmail account
3. Generate an App Password:
   - Go to your Google Account
   - Select Security
   - Under "Signing in to Google," select App passwords
   - Select the app (Mail) and device (Other - Name it "GitHub Actions")
   - Click Generate
4. Add the Gmail address and app password as GitHub secrets:
   - `GMAIL_USER`: Your Gmail address
   - `GMAIL_APP_PASSWORD`: The generated app password

### Stanford API Setup

For the Business Purpose workflow to look up user names:

1. Request access to the Stanford Account API at https://uit.stanford.edu/developers/apis/account
2. Get your API key and secret
3. Add the API key and secret as GitHub secrets named `STANFORD_API_KEY` and `STANFORD_API_SECRET`

## Manual Triggers

All workflows can be manually triggered from the "Actions" tab in GitHub for testing purposes using the workflow_dispatch event.
