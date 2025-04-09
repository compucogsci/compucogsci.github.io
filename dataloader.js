// This script loads presentation data from JSON and makes it available globally

let presentations = []; // Initialize empty array

// Function to load the presentation data
async function loadPresentations() {
  try {
    const response = await fetch('presentations.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    presentations = await response.json();
    
    // Dispatch an event when data is loaded
    const event = new Event('presentationsLoaded');
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error loading presentations data:', error);
  }
}

// Load the data when the script is executed
loadPresentations();
