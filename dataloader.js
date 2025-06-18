// This script loads presentation data and config from JSON and makes it available globally

let presentations = []; // Initialize empty array
let config = {}; // Initialize empty config object

// Function to load all data
async function loadData() {
  try {
    const [presentationsResponse, configResponse] = await Promise.all([
      fetch('presentations.json'),
      fetch('config.json')
    ]);

    if (!presentationsResponse.ok) {
      throw new Error(`HTTP error! Status: ${presentationsResponse.status}`);
    }
    if (!configResponse.ok) {
      throw new Error(`HTTP error! Status: ${configResponse.status}`);
    }

    presentations = await presentationsResponse.json();
    config = await configResponse.json();

    // Dispatch an event when data is loaded
    const event = new Event('dataLoaded');
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Load the data when the script is executed
loadData();
