// let presentations = fetch("https://github.com/compucogsci/compucogsci.github.io/blob/main/presentations.json").then().then().catch();
let presentations = [
    {
        title: "Learning dynamics of deep learning",
        presenter: "Satchel Grant",
        date: "2024-04-30",
        summary: "Understanding analytical solutions to artificial neural networks and its relevance to cognition.",
        links: [
            {
                text: "Paper 1: Neural Race Reduction",
                url: "https://proceedings.mlr.press/v162/saxe22a.html"
            },
            {
                text: "Paper 2: Exact solutions to nonlinear dynamcis of learning in deep nets",
                url: "https://arxiv.org/abs/1312.6120"
            }
        ]
    },
    {
        title: "Library learning",
        presenter: "Sean Anderson",
        date: "2024-05-21",
        summary: "",
        links: [
            {
                text: "Paper 1: Dreamcoder: growing generalizable, interpretable knowledge with wake–sleep bayesian program learning",
                url: "https://royalsocietypublishing.org/doi/epdf/10.1098/rsta.2022.0050"
            },
            {
                text: "Paper 2: How to grow a mind: Statistics, structure, and abstraction",
                url: "https://www.science.org/doi/abs/10.1126/science.1192788"
            }
        ]
    },
    {
        "title": "Language and/or Thought",
        "presenter": "Daniel Wurgaft",
        "date": "2024-06-04",
        "summary": "Discussion on the relationship between language and thought, particularly in the context of large language models and cognitive science.",
        "links": [
            {
                "text": "Paper 1: Dissociating language and thought in large language models",
                "url": "https://www.cell.com/trends/cognitive-sciences/fulltext/S1364-6613(24)00010-X"
            },
            {
                "text": "Paper 2: How language programs the mind",
                "url": "https://onlinelibrary.wiley.com/doi/full/10.1111/tops.12155"
            },
            {
                "text": "Bonus Paper: The language network as a natural kind within the broader landscape of the human brain",
                "url": "https://www.nature.com/articles/s41583-024-00588-4"
            },
            {
                "text": "Bonus Paper: Language and thought are not the same thing: evidence from neuroimaging and neurological patients",
                "url": "https://nyaspubs.onlinelibrary.wiley.com/doi/full/10.1111/nyas.13047"
            }
        ]
    },
    {
        "title": "Social Reasoning",
        "presenter": "Erik Brockbank",
        "date": "2024-06-25",
        "summary": "Exploring machine theory of mind and its implications for social reasoning in artificial intelligence.",
        "links": [
            {
                "text": "Paper 1: Machine Theory of Mind",
                "url": "https://proceedings.mlr.press/v80/rabinowitz18a.html"
            },
            {
                "text": "Adjacent Paper: Mind the gap: challenges of deep learning approaches to Theory of Mind",
                "url": "https://link.springer.com/article/10.1007/s10462-017-9561-7"
            },
            {
                "text": "Adjacent Paper: Computational Social Psychology",
                "url": "https://www.annualreviews.org/doi/abs/10.1146/annurev-psych-010814-015309"
            }
        ]
    },
    {
        "title": "Children, Environment & Reinforcement",
        "presenter": "Xi Jia Zhou",
        "date": "2024-07-02",
        "summary": "Investigating how children learn from rewards and the influence of environmental factors, such as parental presence.",
        "links": [
            {
                "text": "Paper 1: Understanding the development of reward learning through the lens of meta-learning",
                "url": "https://www.sciencedirect.com/science/article/pii/S1364661323000493"
            },
            {
                "text": "Bonus Paper: Parental presence switches avoidance to attraction learning in children",
                "url": "https://www.nature.com/articles/s41562-019-0619-4"
            }
        ]
    },
    {
        "title": "Exploration: Serendipity or strategy?",
        "presenter": "Adani Abutto",
        "date": "2024-08-27",
        "summary": "Exploring the role of empowerment and strategy in exploration behavior within creative contexts.",
        "links": [
            {
                "text": "Paper 1: Empowerment contributes to exploration behaviour in a creative video game",
                "url": "https://www.nature.com/articles/s41562-023-01614-8"
            }
        ],
        "announcements": "Looking for presenters this fall! Don’t forget to RSVP so we know how much food to order! Take attendance. Looking for funding, potentially through the psych grad student activities fund."
    },
    {
        "title": "Generative replay in hippocampus",
        "presenter": "Sean Anderson",
        "date": "2024-09-10",
        "summary": "Exploring how generative replay in the hippocampal-prefrontal circuit aids in compositional inference.",
        "links": [
            {
                "text": "Paper 1: Generative replay underlies compositional inference in the hippocampal-prefrontal circuit",
                "url": "https://www.sciencedirect.com/science/article/pii/S1364661323000119"
            }
        ]
    },
    {
        "title": "Massive online collaboration",
        "presenter": "Ben Prystawski",
        "date": "2024-09-24",
        "summary": "Understanding the dynamics of technological development in virtual communities through collaborative efforts.",
        "links": [
            {
                "text": "Paper 1: Rise and fall of technological development in virtual communities",
                "url": "https://arxiv.org/abs/2301.02137"
            }
        ]
    },
    {
        "title": "Meta-learned Models of Cognition",
        "presenter": "Daniel Wurgaft",
        "date": "2024-10-08",
        "summary": "Exploring how meta-learning can be used to model cognitive processes and enhance artificial intelligence systems.",
        "links": [
            {
                "text": "Paper 1: Meta-learned models of cognition",
                "url": "https://arxiv.org/abs/2301.02564"
            }
        ]
    },
    {
        "title": "[Topic]",
        "presenter": "Emily Chen",
        "date": "2024-10-22",
        "summary": "",
        "links": []
    },
    {
        "title": "[Topic]",
        "presenter": "Junyi Chu",
        "date": "2024-11-05",
        "summary": "",
        "links": []
    },
    {
        "title": "[Topic]",
        "presenter": "Jerome Han",
        "date": "2024-11-19",
        "summary": "",
        "links": []
    },
    {
        "title": "[Language topic]",
        "presenter": "Irmak Ergin",
        "date": "2024-12-03",
        "summary": "",
        "links": []
    }
]


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
