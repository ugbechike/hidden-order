import { expect, test } from "@playwright/test";
import { buildDailyDefinition, buildStageDefinition } from "../../src/features/game/engine";

async function enterName(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Puzzle pilot").fill("Tester");
  await page.getByRole("button", { name: "Start playing" }).click();
}

async function fillGuess(page: import("@playwright/test").Page, target: string[]) {
  await expect(page.locator("[data-object-id]").first()).toBeVisible();
  for (const [index, id] of target.entries()) {
    await page.locator(`[data-object-id="${id}"]`).click({ force: true });
    await page.locator(`[data-guess-slot="${index}"]`).click({ force: true });
  }
}

async function solveCurrentPuzzle(page: import("@playwright/test").Page, solution: string[]) {
  await fillGuess(page, solution);
  await page.getByRole("button", { name: /Submit Guess/i }).click({ force: true });
  await expect(page).toHaveURL(/\/results/);
}

test("starts and completes a stage", async ({ page }) => {
  await enterName(page);
  await page.goto("/game?mode=stage&stage=1");
  await expect(page.getByRole("heading", { name: "Stage 1" })).toBeVisible();
  await solveCurrentPuzzle(page, buildStageDefinition(1).solution);
  await expect(page.getByText("Puzzle completed")).toBeVisible();
});

test("records guesses and shows leaderboard", async ({ page }) => {
  await enterName(page);
  await page.goto("/game?mode=stage&stage=1");
  const solution = buildStageDefinition(1).solution;
  await fillGuess(page, [...solution.slice(1), solution[0]]);
  await expect(page.getByRole("button", { name: /Submit Guess/i })).toBeEnabled();
  await page.getByRole("button", { name: /Submit Guess/i }).click();
  await expect(page.getByRole("heading", { name: "Attempts" })).toBeVisible();
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Fewest guesses wins." })).toBeVisible();
});

test("completes the daily puzzle", async ({ page }) => {
  await enterName(page);
  await page.goto("/game?mode=daily");
  await expect(page.getByRole("heading", { name: "Daily Puzzle" })).toBeVisible();
  await solveCurrentPuzzle(page, buildDailyDefinition().solution);
  await expect(page.getByText("Share Result")).toBeVisible();
});
