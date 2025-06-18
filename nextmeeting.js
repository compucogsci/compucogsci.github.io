function findNextMeeting() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find today's presentation and the next one
    const todayPresentation = presentations.find(p => p.date === today);
    const nextPresentation = presentations.find(p => {
        const presDate = new Date(p.date);
        presDate.setHours(0, 0, 0, 0);
        return presDate > now;
    });

    const timeInfo = config.meetingTime ? ` at ${config.meetingTime.split('-')[0]} ${config.timeZone}` : ' at 3pm PT';

    if (todayPresentation) {
        if (nextPresentation) {
            const nextDate = new Date(nextPresentation.date + 'T' + (config.startTimeISO || '15:00:00-07:00'));
            const options = { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' };
            return `Our next meeting is today${timeInfo}, and the following one will be on ${nextDate.toLocaleDateString('en-US', options)}.`;
        }
        return `Our next meeting is today${timeInfo}.`;
    }

    if (nextPresentation) {
        const date = new Date(nextPresentation.date + 'T' + (config.startTimeISO || '15:00:00-07:00'));
        const options = { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' };
        return `Our next meeting is on ${date.toLocaleDateString('en-US', options)}.`;
    }
    return 'TBD';
}

document.addEventListener('DOMContentLoaded', function() {
    // If data is already loaded, initialize
    if (presentations && presentations.length > 0) {
        displayNextMeeting();
    } else {
        // Otherwise wait for data to load
        document.addEventListener('dataLoaded', function() {
            displayNextMeeting();
        });
    }
});

function displayNextMeeting() {
    const noticeElement = document.getElementById('next-meeting-notice');
    if (noticeElement) {
        noticeElement.textContent = findNextMeeting();
    }

    // Update meeting time and location from config
    const meetingTimeElement = document.getElementById('meeting-time');
    const meetingLocationElement = document.getElementById('meeting-location');

    if (meetingTimeElement && config.meetingDay && config.meetingTime) {
        meetingTimeElement.textContent = `${config.meetingDay}, ${config.meetingTime}`;
    }

    if (meetingLocationElement && config.meetingLocation) {
        meetingLocationElement.textContent = config.meetingLocation;
    }
}
