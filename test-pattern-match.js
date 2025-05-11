// Direct test for pattern matching

// Test string
const taskText = "Fetch yesterday's sales report from VinSolutions for dealer ABC123";

// Test all our patterns
console.log("Testing patterns on:", taskText);

// Test VinSolutions pattern directly
const vinSolutionsPattern = /fetch\s+(?:yesterday['']s\s+)?sales\s+report\s+from\s+vinsolutions/i;
const isVinSolutionsMatch = vinSolutionsPattern.test(taskText);
console.log('VinSolutions pattern match:', isVinSolutionsMatch);

// Test dealer ID extraction
const dealerMatch = taskText.match(/dealer\s+([A-Za-z0-9]+)/i);
console.log('Dealer ID match:', dealerMatch ? dealerMatch[1] : 'None');

// Test individual components
const taskLower = taskText.toLowerCase();
const hasComponents = {
  fetch: taskLower.includes('fetch'),
  yesterday: taskLower.includes('yesterday'),
  sales: taskLower.includes('sales'),
  report: taskLower.includes('report'),
  from: taskLower.includes('from'),
  vinsolutions: taskLower.includes('vinsolutions'),
  dealer: taskLower.includes('dealer')
};
console.log('Individual components:', hasComponents);

// Print the task text with markers to help debug
const markedTask = taskText.replace(/fetch/i, '[[FETCH]]')
  .replace(/yesterday/i, '[[YESTERDAY]]')
  .replace(/sales/i, '[[SALES]]')
  .replace(/report/i, '[[REPORT]]')
  .replace(/from/i, '[[FROM]]')
  .replace(/vinsolutions/i, '[[VINSOLUTIONS]]')
  .replace(/dealer/i, '[[DEALER]]');
  
console.log('Marked task:', markedTask);