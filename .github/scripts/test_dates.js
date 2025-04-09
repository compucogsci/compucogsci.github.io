const utils = require('./utils');

// Test different date formats
const testDates = [
  '2024-05-21',   // ISO format from presentations.json
  '5/21/2024',    // M/D/YYYY format from Google Form
  '05/21/2024',   // MM/DD/YYYY format from Google Form
  '5/21/24'       // M/D/YY format
];

console.log('Testing date normalization:');
testDates.forEach(date => {
  console.log(`Original: "${date}" → Normalized: "${utils.normalizeDate(date)}"`);
});

console.log('\nTesting date equality:');
for (let i = 0; i < testDates.length; i++) {
  for (let j = 0; j < testDates.length; j++) {
    console.log(`"${testDates[i]}" == "${testDates[j]}": ${utils.areDatesEqual(testDates[i], testDates[j])}`);
  }
}
