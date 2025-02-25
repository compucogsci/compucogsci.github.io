
let ascending = true;
const today = new Date().toISOString().split("T")[0];

window.onload = function() {
    filterPresentations("future");
    //displayPresentations(presentations);
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

    list.forEach(presentation => {
        const linkHTML = presentation.links.map(link => `<a href="${link.url}" target="_blank">${link.text}</a>`).join(', ');

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

function toggleSort() {
    ascending = !ascending;
    const sortIcon = document.getElementById('sortIcon');
    sortIcon.textContent = ascending ? '⬆️' : '⬇️';

    presentations.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return ascending ? dateA - dateB : dateB - dateA;
    });
    
    displayPresentations(presentations);
}

function filterPresentations(type) {
    let filteredList = presentations;

    if (type === 'future') {
        filteredList = presentations.filter(presentation => new Date(presentation.date) > new Date(today));
    } else if (type === 'past') {
        filteredList = presentations.filter(presentation => new Date(presentation.date) < new Date(today));
    }

    displayPresentations(filteredList);
}
