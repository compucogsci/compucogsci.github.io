function findNextMeeting() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Find the next presentation after today
    const nextPresentation = presentations.find(p => {
        const presentationDate = new Date(p.date + 'T18:00:00-07:00'); // 6PM PT
        return presentationDate > now;
    });

    if (nextPresentation) {
        const date = new Date(nextPresentation.date + 'T18:00:00-07:00');
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    return 'TBD';
}

window.addEventListener('DOMContentLoaded', () => {
    const noticeElement = document.getElementById('next-meeting-notice');
    if (noticeElement) {
        noticeElement.textContent = `Our next meeting is on ${findNextMeeting()}.`;
    }
});
