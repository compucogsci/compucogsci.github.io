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
- Notification methods (in order of preference):
  1. Email notification (if configured)
  2. Slack notification (if configured)
  3. Create a GitHub issue (fallback option)

**Required Secrets:**
- `GOOGLE_SHEETS_CREDENTIALS`: JSON string of service account credentials
- `SHEET_ID`: ID of your Google Sheet containing RSVPs
- `EMAIL_USER`: Gmail address to send from (optional)
- `EMAIL_PASSWORD`: App password for Gmail (optional)
- `NOTIFICATION_EMAIL`: Email to receive notifications (optional)
- `SLACK_WEBHOOK_URL`: Webhook URL for Slack notifications (optional)

**Files:**
- `.github/scripts/rsvp_count.js`: Main script for counting RSVPs
- `.github/workflows/rsvp_count.yml`: Workflow definition file

### 2. Presentation Announcements (`announcement.yml`)

Sends announcement emails for upcoming reading group presentations.

**Functionality:**
- Runs every Monday at 10:00 AM PDT (17:00 UTC)
- Checks for upcoming presentations in `presentations.json`
- Sends an announcement email with presentation details
- Includes a link to the RSVP form

**Required Secrets:**
- `EMAIL_USER`: Email address to send from
- `EMAIL_PASS`: Password/app password for the email account
- `RECIPIENT_EMAIL`: Email address to send announcements to
- `GOOGLE_FORM_URL`: URL for the RSVP Google Form

**Files:**
- `.github/scripts/send_announcement.js`: Script that sends announcement emails
- `.github/workflows/announcement.yml`: Workflow definition file

### 3. Business Purpose Generator (`business_purpose.yml`)

Automatically generates a business purpose email draft for reimbursement processes after each meeting.

**Functionality:**
- Runs every Wednesday at 10:00 AM PT
- Identifies the most recent meeting that has occurred
- Fetches unique email addresses from the Google Sheet for that meeting date
- Looks up attendee names using the Stanford Account API
- Creates a properly formatted list of attendees with Oxford comma
- Either:
  1. Creates a draft email in your Microsoft Exchange account
  2. Sends you an email with the business purpose template

**Required Secrets:**
- `GOOGLE_SHEETS_CREDENTIALS`: JSON string of service account credentials
- `SHEET_ID`: ID of your Google Sheet containing RSVPs
- `EMAIL_USER`: Email address for sending notifications
- `EMAIL_PASSWORD`: App password for email account
- `NOTIFICATION_EMAIL`: Email to receive the business purpose draft
- `STANFORD_API_KEY`: API key for Stanford Account API
- `STANFORD_API_SECRET`: Secret for Stanford Account API
- `MS_TENANT_ID`: Microsoft tenant ID (for draft creation, optional)
- `MS_CLIENT_ID`: Microsoft app client ID (for draft creation, optional)
- `MS_CLIENT_SECRET`: Microsoft app client secret (for draft creation, optional)
- `SLACK_WEBHOOK_URL`: Webhook for optional Slack notifications (optional)

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

### Email Setup for Notifications

1. Enable 2-Step Verification on your Gmail account
2. Generate an App Password for this script
3. Add the app password as GitHub secrets:
   - `EMAIL_PASSWORD` for RSVP counting
   - `EMAIL_PASS` for announcements

### Stanford API Setup

For the Business Purpose workflow to look up user names:

1. Request access to the Stanford Account API at https://uit.stanford.edu/developers/apis/account
2. Get your API key and secret
3. Add the API key and secret as GitHub secrets named `STANFORD_API_KEY` and `STANFORD_API_SECRET`

### Microsoft Graph API Setup (Optional)

For creating draft emails directly in your Microsoft Exchange account:

1. Register an application in Azure Active Directory
2. Grant it Mail.ReadWrite permissions
3. Get your tenant ID, client ID, and client secret
4. Add these as GitHub secrets named `MS_TENANT_ID`, `MS_CLIENT_ID`, and `MS_CLIENT_SECRET`

## Manual Triggers

All workflows can be manually triggered from the "Actions" tab in GitHub for testing purposes using the workflow_dispatch event.
