// Fix imports
const fetch = require('node-fetch');
const { DOMParser } = require('xmldom');

/**
 * Get paper metadata from a DOI
 * @param {string} doi - DOI identifier (e.g., "10.1038/nature09210")
 * @returns {Promise<Object>} Paper metadata
 */
async function getPaperMetadataFromDOI(doi) {
  try {
    // Clean up the DOI if it includes the full URL
    const cleanDoi = doi.replace(/^https?:\/\/doi.org\//, '');

    // Special handling for arXiv DOIs
    const isArxiv = cleanDoi.includes('arxiv') || cleanDoi.startsWith('10.48550/arxiv.');

    // Call the appropriate API
    let response;
    if (isArxiv) {
      // Extract the arXiv ID from the DOI
      let arxivId = cleanDoi;
      if (cleanDoi.startsWith('10.48550/arxiv.')) {
        arxivId = cleanDoi.replace('10.48550/arxiv.', '');
      } else if (cleanDoi.includes('/')) {
        arxivId = cleanDoi.split('/').pop();
      }

      // Call the arXiv API
      response = await fetch(`http://export.arxiv.org/api/query?id_list=${arxivId}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CompCogSci Reading Group (https://compucogsci.github.io/'
        }
      });

      if (!response.ok) {
        throw new Error(`arXiv API request failed with status ${response.status}`);
      }

      const text = await response.text();

      // Parse the XML response using xmldom
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      // Create a metadata object that mimics Crossref structure
      const entry = xmlDoc.getElementsByTagName('entry')[0];
      if (!entry) {
        throw new Error('No entry found in arXiv response');
      }

      const titleEl = entry.getElementsByTagName('title')[0];
      const title = titleEl ? titleEl.textContent.trim() : '';

      const authorElements = entry.getElementsByTagName('author');
      const authors = [];

      for (let i = 0; i < authorElements.length; i++) {
        const nameEl = authorElements[i].getElementsByTagName('name')[0];
        if (nameEl) {
          const name = nameEl.textContent.trim();
          const nameParts = name.split(' ');
          const family = nameParts.pop() || '';
          const given = nameParts.join(' ');
          authors.push({ family, given });
        }
      }

      const publishedEl = entry.getElementsByTagName('published')[0];
      const published = publishedEl ? publishedEl.textContent.trim() : '';
      const publishedDate = published ? new Date(published) : null;

      const idEl = entry.getElementsByTagName('id')[0];
      const url = idEl ? idEl.textContent.trim() : '';

      return {
        title: title ? [title] : [],
        author: authors,
        published: publishedDate ? {
          'date-parts': [[publishedDate.getFullYear(), publishedDate.getMonth() + 1, publishedDate.getDate()]]
        } : null,
        'container-title': ['arXiv'],
        publisher: 'arXiv',
        URL: url,
        DOI: cleanDoi
      };
    } else {
      // Use Crossref API for regular DOIs
      response = await fetch(`https://api.crossref.org/works/${cleanDoi}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CompCogSci Reading Group (https://compucogsci.github.io/'
        }
      });

      if (!response.ok) {
        throw new Error(`DOI API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.message;
    }
  } catch (error) {
    console.error(`Error retrieving metadata for DOI ${doi}:`, error);
    return null;
  }
}

/**
 * Generate an APA citation from a DOI
 * @param {string} doi - DOI identifier
 * @returns {Promise<Object>} Object with title and citation
 */
async function getAPACitationFromDOI(doi) {
  const metadata = await getPaperMetadataFromDOI(doi);

  if (!metadata) {
    return { title: null, citation: null };
  }

  try {
    // Extract paper title
    const title = metadata.title ? metadata.title[0] : 'Unknown Title';

    // Extract authors
    let authorString = 'Unknown Author';
    let shortAuthorString = 'Unknown Author';

    if (metadata.author && metadata.author.length > 0) {
      // For full citation
      const authors = metadata.author.map(author => {
        const family = author.family || '';
        const given = author.given ? `${author.given.charAt(0)}.` : '';
        return family ? `${family}, ${given}` : '';
      }).filter(Boolean);

      // For short citation - last names only
      const shortAuthors = metadata.author.map(author => {
        return author.family || '';
      }).filter(Boolean);

      if (authors.length === 1) {
        authorString = authors[0];
        shortAuthorString = shortAuthors[0];
      } else if (authors.length === 2) {
        authorString = `${authors[0]} & ${authors[1]}`;
        shortAuthorString = `${shortAuthors[0]} & ${shortAuthors[1]}`;
      } else if (authors.length > 2) {
        authorString = `${authors[0]} et al.`;
        shortAuthorString = `${shortAuthors[0]} et al.`;
      }
    }

    // Extract year
    const year = metadata.published ?
      (metadata.published['date-parts'] ? metadata.published['date-parts'][0][0] : 'n.d.') :
      'n.d.';

    // Extract journal/publication name
    let journalName = '';
    if (metadata['container-title'] && metadata['container-title'].length > 0) {
      journalName = metadata['container-title'][0];
    } else if (metadata['publisher']) {
      journalName = metadata['publisher'];
    }

    // Extract volume, issue, and page numbers
    const volume = metadata.volume ? metadata.volume : '';
    const issue = metadata.issue ? `(${metadata.issue})` : '';

    let pages = '';
    if (metadata.page) {
      pages = metadata.page.replace('-', '–'); // Use en-dash for page ranges
    }

    // Construct the citation
    let citation = `${authorString} (${year}). ${title}`;

    if (journalName) {
      citation += `. ${journalName}`;

      if (volume) {
        citation += `, ${volume}${issue}`;

        if (pages) {
          citation += `, ${pages}`;
        }
      }
    }

    citation += `. https://doi.org/${doi}`;

    // Return both title and citation
    return {
      title: title,
      citation: citation,
      authors: shortAuthorString, // Use short format for authors (last names only)
      year: year,
      journal: journalName
    };
  } catch (error) {
    console.error(`Error generating citation for DOI ${doi}:`, error);
    return {
      title: metadata.title ? metadata.title[0] : null,
      citation: `https://doi.org/${doi}`
    };
  }
}

// Export the functions
module.exports = {
  getPaperMetadataFromDOI,
  getAPACitationFromDOI,
};