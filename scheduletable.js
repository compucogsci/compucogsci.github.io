let ascending = true;
let currentFilter = 'future'; // Track current filter state
const today = new Date().toISOString().split("T")[0];

window.onload = function() {
    filterPresentations("future");
};

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
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

window.onload = function() {
    filterPresentations('future');
};
