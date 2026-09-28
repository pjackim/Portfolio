/**
 * The site header's controls, wherever the viewport puts them (SiteHeader.astro): from 40rem up
 * the home link (monogram, plus the wordmark from 73.75rem), a centred 4-item nav
 * (About/Experience/Work/Contact), then Capabilities (from 57.5rem), Résumé and the theme switch;
 * on phones the bar is the same 4 items as a segmented nav, pj's monogram and the theme switch
 * (no wordmark, Capabilities or Résumé there — see the About panel and the sticky CTA bar,
 * HomeMobilePanels.astro).
 */
import type { Locator, Page } from '@playwright/test';

/** The theme switch a visitor can reach now: the wordmark bar's, or the phone bar's. */
export const themeToggle = (page: Page): Locator =>
  page.locator('[data-theme-toggle]').locator('visible=true');

/** The header monogram on show: the wordmark's, or the phone bar's. */
export const headerMonogram = (page: Page): Locator =>
  page.locator('.site-header .monogram').locator('visible=true');

/** A phone-nav item (About/Experience/Work/Contact) by its label. */
export const phoneNavItem = (page: Page, label: string): Locator =>
  page.locator('.phone-nav__item', { hasText: label });
