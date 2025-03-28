let ascending = true;
let currentFilter = 'future'; // Track current filter state
const today = new Date().toISOString().split("T")[0];

// Wait for DOM and data to be ready
document.addEventListener('DOMContentLoaded', function() {
    // If data is already loaded, initialize
    if (presentations && presentations.length > 0) {
        filterPresentations('future');
    } else {
        // Otherwise wait for data to load
        document.addEventListener('presentationsLoaded', function() {
            filterPresentations('future');
        });
    }
});

function formatDate(dateStr) {
    // Create date with specific time (6pm PT) to ensure correct day
    const date = new Date(dateStr + 'T18:00:00-07:00');
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Los_Angeles'
    };
    const formattedDate = date.toLocaleDateString('en-US', options);
    // Split into components: "Tuesday, April 30, 2024"
    const [weekday, monthDay, year] = formattedDate.split(', ');
    return `${weekday}, <strong>${monthDay}</strong>, ${year}`;
}

function displayPresentations(list) {
    const table = document.getElementById('presentations');
    table.innerHTML = '';
 
    const sortedAndFiltered = filterAndSortPresentations(list, currentFilter, ascending);
    sortedAndFiltered.forEach(presentation => {
        const linkHTML = presentation.links.map(link => 
            `<a href="${link.url}" target="_blank">${link.text}</a>`
        ).join(', ');

        let row = `<tr>
            <td>${formatDate(presentation.date)}</td>
            <td>${presentation.presenter}</td>
            <td>${presentation.title}</td>
            <td>${presentation.summary}</td>
            <td>${linkHTML}</td>
        </tr>`;
        table.innerHTML += row;
    });
}

function filterAndSortPresentations(list, filterType, ascending) {
    // First filter
    let filteredList = list;
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);

    if (filterType === 'future') {
        filteredList = list.filter(presentation => {
            const presDate = new Date(presentation.date);
            presDate.setHours(0, 0, 0, 0);
            return presDate >= nowDate;
        });
    } else if (filterType === 'past') {
        filteredList = list.filter(presentation => {
            const presDate = new Date(presentation.date);
            presDate.setHours(0, 0, 0, 0);
            return presDate < nowDate;
        });
    }

    // Then sort
    return filteredList.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return ascending ? dateA - dateB : dateB - dateA;
    });
}

function toggleSort() {
    ascending = !ascending;
    const sortIcon = document.getElementById('sortIcon');
    sortIcon.textContent = ascending ? '⬆️' : '⬇️';
    displayPresentations(presentations);
}

function filterPresentations(type) {
    currentFilter = type;
    displayPresentations(presentations);
}
