import {expect, test} from '@playwright/test';

test('cleans tracking parameters on startup without reloading', async ({page}) => {
  const documentRequests: string[] = [];
  page.on('request', request => {
    if (request.resourceType() === 'document') documentRequests.push(request.url());
  });
  await page.goto('/?utm_source=chatgpt.com&fbclid=1&gclid=2&msclkid=3');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  expect(documentRequests).toHaveLength(1);
});

test('preserves the pathname, functional query encoding, and hash navigation', async ({page}) => {
  await page.goto('/portfolio?tag=a%20b&%55TM_medium=chat&tag=c&mode=full#/projects/classroom-management');
  await expect(page).toHaveURL('/portfolio?tag=a%20b&tag=c&mode=full#/projects/classroom-management');
  await expect(page.getByRole('heading', {name: 'Classroom Management System', exact: true})).toBeVisible();
});
