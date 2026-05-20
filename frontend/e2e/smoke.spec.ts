import { expect, test } from '@playwright/test'

test('home shows Skill tracker heading', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /skill tracker/i }),
  ).toBeVisible({ timeout: 90_000 })
})
