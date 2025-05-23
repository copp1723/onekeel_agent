// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const loadingState = document.getElementById('loadingState');
const loadingMessage = document.getElementById('loadingMessage');
const resultContainer = document.getElementById('resultContainer');
const resultStatusIcon = document.getElementById('resultStatusIcon');
const resultTitle = document.getElementById('resultTitle');
const resultContent = document.getElementById('resultContent');
const newTaskButton = document.getElementById('newTaskButton');

// API Endpoints
const API_BASE_URL = window.location.origin;
const SUBMIT_TASK_ENDPOINT = `${API_BASE_URL}/api/tasks`;
const GET_TASK_ENDPOINT = `${API_BASE_URL}/api/tasks/`;

// Polling interval in milliseconds
const POLLING_INTERVAL = 2000;

// Track if polling is active
let isPolling = false;
// Store the current task ID
let currentTaskId = null;

// Submit a new task
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const taskText = taskInput.value.trim();
  if (!taskText) return;
  
  try {
    // Disable the input field and submit button during processing
    taskInput.disabled = true;
    const submitButton = taskForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.classList.add('opacity-50', 'cursor-not-allowed');
    
    // Show loading state
    taskForm.parentElement.classList.add('hidden');
    loadingState.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    // Submit the task
    const response = await fetch(SUBMIT_TASK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task: taskText })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    currentTaskId = data.id;
    
    // Start polling for results
    startPolling(currentTaskId);
    
  } catch (error) {
    showError('Failed to submit task', error.message);
    
    // Re-enable the form if there's an error
    taskInput.disabled = false;
    const submitButton = taskForm.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
    taskForm.parentElement.classList.remove('hidden');
  }
});

// Reset UI and start a new task
newTaskButton.addEventListener('click', () => {
  // Stop any polling
  isPolling = false;
  
  // Enable form inputs
  taskInput.disabled = false;
  const submitButton = taskForm.querySelector('button[type="submit"]');
  submitButton.disabled = false;
  submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
  
  // Reset UI
  taskInput.value = '';
  taskForm.parentElement.classList.remove('hidden');
  loadingState.classList.add('hidden');
  resultContainer.classList.add('hidden');
  
  // Focus the input for immediate typing
  setTimeout(() => taskInput.focus(), 100);
});

// Start polling for task results
function startPolling(taskId) {
  isPolling = true;
  let attempts = 0;
  
  const poll = async () => {
    if (!isPolling) return;
    
    try {
      attempts++;
      
      // Update loading message
      if (attempts > 5) {
        loadingMessage.textContent = 'This task is taking longer than usual. Still working on it...';
      }
      
      const response = await fetch(GET_TASK_ENDPOINT + taskId);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const taskData = await response.json();
      
      // Check if task is complete
      if (taskData.status === 'completed') {
        // Display results
        showResults(taskData);
        isPolling = false;
      } else if (taskData.status === 'failed') {
        // Show error
        showError('Task Failed', taskData.error || 'An unknown error occurred');
        isPolling = false;
      } else {
        // Continue polling
        setTimeout(poll, POLLING_INTERVAL);
      }
    } catch (error) {
      showError('Error checking task status', error.message);
      isPolling = false;
    }
  };
  
  // Start the polling process
  poll();
}

// Show successful results
function showResults(taskData) {
  loadingState.classList.add('hidden');
  resultContainer.classList.remove('hidden');
  
  // Set success icon
  resultStatusIcon.innerHTML = '<svg class="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
  
  // Set title
  resultTitle.textContent = 'Task Completed Successfully';
  
  // Extract the final result content, focusing ONLY on the last step's output
  let finalResult = '';
  
  if (taskData.result) {
    // For multi-step tasks, show ONLY the final step's output (what the user asked for)
    if (taskData.result.type === 'multi_step' && taskData.result.steps && taskData.result.steps.length > 0) {
      // Get the last step result - this is the actual output the user cares about
      const lastStep = taskData.result.steps[taskData.result.steps.length - 1];
      
      if (lastStep.tool === 'summarizeText' && lastStep.output && lastStep.output.summary) {
        // For summarization tasks, show the summary text directly
        finalResult = `<div class="bg-gray-50 p-4 rounded-md mb-4">${lastStep.output.summary}</div>`;
      } else if (lastStep.tool === 'extractCleanContent' && lastStep.output && lastStep.output.content) {
        // For content extraction, show the extracted content
        finalResult = `<div class="bg-gray-50 p-4 rounded-md mb-4">${lastStep.output.content}</div>`;
      } else if (lastStep.output) {
        // For other tools, show the output in a structured format
        finalResult = `<pre class="bg-gray-50 p-4 rounded-md overflow-auto">${JSON.stringify(lastStep.output, null, 2)}</pre>`;
      }
      
      // If we have data.summary directly in the result (some response formats), prioritize this
      if (taskData.result.data && taskData.result.data.summary) {
        finalResult = `<div class="bg-gray-50 p-4 rounded-md mb-4">${taskData.result.data.summary}</div>`;
      }
    } else if (taskData.result.output) {
      // Single-step task results
      finalResult = `<pre class="bg-gray-50 p-4 rounded-md overflow-auto">${JSON.stringify(taskData.result.output, null, 2)}</pre>`;
    } else {
      // Fallback for other result formats
      finalResult = `<pre class="bg-gray-50 p-4 rounded-md overflow-auto">${JSON.stringify(taskData.result, null, 2)}</pre>`;
    }
  } else {
    finalResult = '<p>Task completed, but no result data was returned.</p>';
  }
  
  // Insert the content
  resultContent.innerHTML = finalResult;
}

// Show error state
function showError(title, message) {
  loadingState.classList.add('hidden');
  resultContainer.classList.remove('hidden');
  
  // Set error icon
  resultStatusIcon.innerHTML = '<svg class="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
  
  // Simplify error display with consistent message
  resultTitle.textContent = '❌ Task Failed';
  
  // Use a generic user-friendly message instead of technical details
  resultContent.innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <p class="text-red-700">Task failed. Please try again.</p>
      ${message ? `<p class="text-red-500 text-sm mt-2">Details: ${message}</p>` : ''}
    </div>
  `;
}