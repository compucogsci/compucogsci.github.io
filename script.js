let presentations = [
    {
        title: "Introduction to Bayesian Models",
        presenter: "Alice",
        date: "2024-10-15",
        summary: "An introduction to Bayesian cognitive models.",
        links: [
            { text: "Slides", url: "https://example.com/slides1" },
            { text: "Recording", url: "https://example.com/recording1" }
        ]
    },
    {
        title: "Reinforcement Learning in Cognitive Science",
        presenter: "Bob",
        date: "2023-09-20",
        summary: "Discussion on how RL is applied in cognitive models.",
        links: [{ text: "Recording", url: "https://example.com/recording2" }]
    },
    {
        title: "Connectionist Models",
        presenter: "Carol",
        date: "2024-11-05",
        summary: "Exploring neural networks in cognitive science.",
        links: [{ text: "Slides", url: "https://example.com/slides2" }]
    },
    {
        title: "Cognitive Architectures",
        presenter: "David",
        date: "2023-08-18",
        summary: "Overview of cognitive architectures such as ACT-R and SOAR.",
        links: [{ text: "Summary", url: "https://example.com/summary" }]
    }
];

let ascending = true;
const today = new Date().toISOString().split("T")[0];

window.onload = function() {
    displayPresentations(presentations);
};

function displayPresentations(list) {
    const table = document.getElementById('presentations');
    table.innerHTML = '';

    list.forEach(presentation => {
        const linkHTML = presentation.links.map(link => `<a href="${link.url}" target="_blank">${link.text}</a>`).join(', ');

        let row = `<tr>
            <td>${presentation.date}</td>
            <td>${presentation.title}</td>
            <td>${presentation.presenter}</td>
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
