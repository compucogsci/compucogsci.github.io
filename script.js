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
                "url": "https://www.cell.com/trends/cognitive-sciences/abstract/S1364-6613(24)00027-5"
            },
            {
                "text": "Paper 2: How language programs the mind",
                "url": "https://onlinelibrary.wiley.com/doi/full/10.1111/tops.12155"
            },
            {
                "text": "Bonus Paper: The language network as a natural kind within the broader landscape of the human brain",
                "url": "https://www.nature.com/articles/s41583-024-00802-4"
            },
            {
                "text": "Bonus Paper: Language and thought are not the same thing: evidence from neuroimaging and neurological patients",
                "url": "https://nyaspubs.onlinelibrary.wiley.com/doi/full/10.1111/nyas.13046?casa_token=XD66qE2Lde0AAAAA%3A5NOw2KOM8xUwI4vHtBv2w49sHzasP4GVSSEz9BqugK3l11613KK1qfwo9JeHwdJ81XyCCBHfX8qeGg"
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
                "url": "http://proceedings.mlr.press/v80/rabinowitz18a.html"
            },
            {
                "text": "Adjacent Paper: Mind the gap: challenges of deep learning approaches to Theory of Mind",
                "url": "https://link.springer.com/article/10.1007/s10462-023-10401-x"
            },
            {
                "text": "Adjacent Paper: Computational Social Psychology",
                "url": "https://www.annualreviews.org/content/journals/10.1146/annurev-psych-021323-040420"
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
                "url": "https://www.nature.com/articles/s44159-024-00304-1"
            },
            {
                "text": "Bonus Paper: Parental presence switches avoidance to attraction learning in children",
                "url": "https://www.nature.com/articles/s41562-019-0656-9"
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
                "url": "https://www.nature.com/articles/s41562-023-01661-2"
            }
        ],
    },
    {
        "title": "Generative replay in hippocampus",
        "presenter": "Sean Anderson",
        "date": "2024-09-10",
        "summary": "Exploring how generative replay in the hippocampal-prefrontal circuit aids in compositional inference.",
        "links": [
            {
                "text": "Paper 1: Generative replay underlies compositional inference in the hippocampal-prefrontal circuit",
                "url": "https://www.sciencedirect.com/science/article/pii/S0092867423010255"
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
                "url": "https://osf.io/preprints/psyarxiv/tz4dn"
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
                "url": "https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/metalearned-models-of-cognition/F95059E07AE6E82AE56C4164A5384A18"
            }
        ]
    },
    {
        "title": "Getting Aligned on Representational Alignment",
        "presenter": "Linas Nasvytis, Alexa Tartaglini",
        "date": "2024-10-29",
        "summary": "What is representational alignment, how have different fields approached the topic, and what are the outstanding problems in the unified field? Only read Sections 1, 2.1, 4.1, 4.3, and 5. The rest is optional.",
        "links": [
            {
                "text": "Paper 1: Getting Aligned on Representational Alignment",
                "url": "https://arxiv.org/abs/2310.13018"
            }
        ]
    },
    {
        "title": "The affective gradient hypothesis",
        "presenter": "Junyi Chu",
        "date": "2024-11-12",
        "summary": "A trends in cogsci paper offering a solution to the puzzle of \"where do values and goals come from?\"",
        "links": [{
                "text": "Paper 1: The affective gradient hypothesis: an affect-centered account of motivated behavior",
                "url": "https://static1.squarespace.com/static/56e19a6d04426223be32a8b9/t/66fe22de0dea8f6ac730cff3/1727931104942/Shenhav_inPress_TiCS.pdf"
            }
        ]
    },
    {
        "title": "Complementary Learning Systems",
        "presenter": "Jerome Han",
        "date": "2024-11-26",
        "summary": "",
        "links": [{
            "text": "Paper 1: Why There Are Complementary Learning Systems in the Hippocampus and Neocortex: Insights From the Successes and Failures of Connectionist Models of Learning and Memory",
            "url": "https://psycnet.apa.org/fulltext/1995-42327-001.pdf"
        }]
    },
    {
        "title": "Predictive Coding or Just Feature Discovery?",
        "presenter": "Irmak Ergin",
        "date": "2025-01-14",
        "summary": "",
        "links": [{
            "text": "Paper 1: Predictive Coding or Just Feature Discovery? An Alternative Account of Why Language Models Fit Brain Data",
            "url": "https://direct.mit.edu/nol/article/5/1/64/113632/Predictive-Coding-or-Just-Feature-Discovery-An"
        },
        {
            "text": "Optional Paper 2: Shared computational principles for language processing in humans and deep language models",
            "url": "https://www.nature.com/articles/s41593-022-01026-4"
        }]
    },
    {
        "title": "A neural substrate of prediction and reward",
        "presenter": "Ryan Yan",
        "date": "2025-01-28",
        "summary": "",
        "links": [{
            "text": "Paper 1: A neural substrate of prediction and reward",
            "url": "https://www.science.org/doi/full/10.1126/science.275.5306.1593"
        },]
    },
    {
        "title": "Number Cognition",
        "presenter": "Bendix Kemmann",
        "date": "2025-02-11",
        "summary": "",
        "links": []
    },
    {
        "title": "Inference from social evaluation",
        "presenter": "Adani Abutto",
        "date": "2025-03-11",
        "summary": "",
        "links": [{
            "text": "Paper 1: Inference from social evaluation",
            "url": "https://stanfordpsych.slack.com/archives/C076M0SRVD1/p1737936178354179?thread_ts=1737935475.328779&cid=C076M0SRVD1"
        },]
    },
    {
        "title": "TBD",
        "presenter": "Nastasia Klevak",
        "date": "2025-05-20",
        "summary": "TBD",
        "links": []
    },
]


let ascending = true;
const today = new Date().toISOString().split("T")[0];

window.onload = function() {
    filterPresentations("future");
    //displayPresentations(presentations);
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
