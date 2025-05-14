import { test, expect } from '@playwright/test';

// Create a test group
const userJourneyTest = test.describe('User Journey Tests', () => {
  // Mock API responses for all tests in this group
  test.beforeEach(async ({ page }) => {
  // Mock credentials list API
  await page.route('**/api/credentials', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock credential creation API
  await page.route('**/api/credentials', async route => {
    if (route.request().method() === 'POST') {
      const requestBody = JSON.parse(await route.request().postData() || '{}');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-credential-id',
          ...requestBody,
        }),
      });
    }
  });

  // Mock tasks list API
  await page.route('**/api/tasks', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock task creation API
  await page.route('**/api/tasks', async route => {
    if (route.request().method() === 'POST') {
      const requestBody = JSON.parse(await route.request().postData() || '{}');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-task-id',
          userId: 'mock-user-id',
          status: 'pending',
          createdAt: new Date().toISOString(),
          ...requestBody,
        }),
      });
    }
  });

  // Mock single task API
  await page.route('**/api/tasks/mock-task-id', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-task-id',
        userId: 'mock-user-id',
        taskType: 'analyzeCRMData',
        taskText: 'inventoryAging',
        platform: 'VinSolutions',
        status: 'completed',
        result: {
          title: 'Inventory Aging Analysis',
          description: 'Analysis of vehicle inventory age and turnover rate',
          insights: [
            'Average days in inventory: 45 days',
            'Vehicles over 60 days: 32% of inventory',
            'Fastest moving models: SUVs and crossovers'
          ],
          actionItems: [
            'Consider price reductions for inventory over 60 days',
            'Increase marketing focus on slow-moving luxury sedans',
            'Adjust purchasing to favor high-turnover vehicle classes'
          ],
          score: 8.5
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }),
    });
  });
});

test('full user journey - add credential, submit task, view results', async ({ page }) => {
  // Step 1: Navigate to the homepage
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Insight Engine' })).toBeVisible();

  // Step 2: Add a new credential
  await page.getByLabel('Platform').selectOption('VinSolutions');
  await page.getByLabel('Username').fill('test@example.com');
  await page.getByLabel('Password').fill('securepassword');
  await page.getByRole('button', { name: 'Save Credentials' }).click();

  // Wait for credential to be saved
  await page.waitForTimeout(500);

  // Step 3: Submit a task
  await page.getByLabel('Platform').selectOption('VinSolutions');
  await page.getByLabel('What insights do you need?').selectOption('inventoryAging');
  await page.getByRole('button', { name: 'Generate Insights' }).click();

  // Step 4: Verify redirection to results page
  await expect(page).toHaveURL(/\/results\/mock-task-id$/);

  // Check for loading state first
  await expect(page.getByText('Processing your request')).toBeVisible();

  // Mock the task completion by reloading (in a real test, we'd wait for the polling to complete)
  await page.reload();

  // Step 5: Verify results are displayed
  await expect(page.getByText('Inventory Aging Analysis')).toBeVisible();
  await expect(page.getByText('Average days in inventory: 45 days')).toBeVisible();
  await expect(page.getByText('Consider price reductions for inventory over 60 days')).toBeVisible();

  // Step 6: Navigate back to all results
  await page.getByRole('link', { name: 'All Results' }).click();
  await expect(page).toHaveURL(/\/results$/);

  // Step 7: Navigate back to homepage
  await page.getByRole('link', { name: /Back to Dashboard/ }).click();
  await expect(page).toHaveURL(/\/$/);
  });
});