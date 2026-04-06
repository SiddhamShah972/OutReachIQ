import { test, expect } from '@playwright/test'

test.describe('Web application workflow', () => {
  test('landing page shows auth entry points', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'OutReachIQ' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
    await expect(page.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register')
  })

  test('login page renders Google sign in call-to-action', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Welcome to OutreachIQ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  })

  test('register path reaches onboarding flow', async ({ page }) => {
    await page.goto('/register')

    await expect(page).toHaveURL(/\/onboarding$/)
    await expect(page.getByRole('heading', { name: 'Tell us about your goals' })).toBeVisible()
    await expect(page.getByLabel('Target Role')).toBeVisible()
  })

  test('protected dashboard routes redirect to login for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Welcome to OutreachIQ' })).toBeVisible()
  })
})
