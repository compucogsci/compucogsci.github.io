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

    if (todayPresentation) {
        if (nextPresentation) {
            const nextDate = new Date(nextPresentation.date + 'T18:00:00-07:00');
            const options = { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' };
            return `Our next meeting is today at 6pm PT, and the following one will be on ${nextDate.toLocaleDateString('en-US', options)}.`;
        }
        return 'Our next meeting is today at 6pm PT.';
    }

    if (nextPresentation) {
        const date = new Date(nextPresentation.date + 'T18:00:00-07:00');
        const options = { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' };
        return `Our next meeting is on ${date.toLocaleDateString('en-US', options)}.`;
    }
    return 'TBD';
}

window.addEventListener('DOMContentLoaded', () => {
    const noticeElement = document.getElementById('next-meeting-notice');
    if (noticeElement) {
        noticeElement.textContent = findNextMeeting();
    }
});
