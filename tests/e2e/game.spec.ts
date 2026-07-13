import { expect, test } from "@playwright/test";
import { buildDailyDefinition, buildStageDefinition } from "../../src/features/game/engine";

async function enterName(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Puzzle pilot").fill("Tester");
  await page.getByRole("button", { name: "Start playing" }).click();
}

async function arrangeGuess(page: import("@playwright/test").Page, target: string[]) {
  await expect(page.locator("[data-object-id]").first()).toBeVisible();
  for (let index = 0; index < target.length; index += 1) {
    const currentIds = await page.locator("[data-object-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-object-id")));
    if (currentIds[index] === target[index]) continue;
    const swapIndex = currentIds.indexOf(target[index]);
    await page.locator("[data-object-id]").nth(index).click({ force: true });
    await page.locator("[data-object-id]").nth(swapIndex).click({ force: true });
  }
}

async function solveCurrentPuzzle(page: import("@playwright/test").Page, solution: string[]) {
  await arrangeGuess(page, solution);
  await page.getByRole("button", { name: /Submit Guess/i }).click({ force: true });
  await expect(page.getByText("Perfect match")).toBeVisible();
  await expect(page.getByRole("link", { name: "Play Again" })).toBeVisible();
}

test("starts and completes a stage", async ({ page }) => {
  await enterName(page);
  await page.goto("/game?mode=stage&stage=1");
  await expect(page.getByRole("heading", { name: "Stage 1" })).toBeVisible();
  await solveCurrentPuzzle(page, buildStageDefinition(1).solution);
  await expect(page).toHaveURL(/\/game/);
  await expect(page.getByRole("link", { name: "Continue" })).toBeVisible();
});

test("records guesses and shows leaderboard", async ({ page }) => {
  await enterName(page);
  await page.goto("/game?mode=stage&stage=1");
  const solution = buildStageDefinition(1).solution;
  await arrangeGuess(page, [...solution.slice(1), solution[0]]);
  await expect(page.getByRole("button", { name: /Submit Guess/i })).toBeEnabled();
  await page.getByRole("button", { name: /Submit Guess/i }).click();
  await expect(page.getByText(/Last Result/i)).toBeVisible();
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Fewest guesses wins." })).toBeVisible();
});

test("completes the daily puzzle", async ({ page }) => {
  await enterName(page);
  await page.goto("/game?mode=daily");
  await expect(page.getByRole("heading", { name: "Daily Puzzle" })).toBeVisible();
  await solveCurrentPuzzle(page, buildDailyDefinition().solution);
  await expect(page.getByRole("link", { name: "View Leaderboard" })).toBeVisible();
});
