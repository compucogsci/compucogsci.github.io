// Fix imports
const fetch = require('node-fetch');

/**
 * Get paper metadata from a DOI
 * @param {string} doi - DOI identifier (e.g., "10.1038/nature09210")
 * @returns {Promise<Object>} Paper metadata
 */
async function getPaperMetadataFromDOI(doi) {
  try {
    // Clean up the DOI if it includes the full URL
    const cleanDoi = doi.replace(/^https?:\/\/doi.org\//, '');
    
    // Call the Crossref API
    const response = await fetch(`https://api.crossref.org/works/${cleanDoi}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CompCogSci Reading Group (https://compucogsci.github.io/; compcogscireadinggroup@gmail.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DOI API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.message;
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
    if (metadata.author && metadata.author.length > 0) {
      const authors = metadata.author.map(author => {
        const family = author.family || '';
        const given = author.given ? `${author.given.charAt(0)}.` : '';
        return family ? `${family}, ${given}` : '';
      }).filter(Boolean);
      
      if (authors.length === 1) {
        authorString = authors[0];
      } else if (authors.length === 2) {
        authorString = `${authors[0]} & ${authors[1]}`;
      } else if (authors.length > 2) {
        authorString = `${authors[0]} et al.`;
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
      authors: authorString,
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