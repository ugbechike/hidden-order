import { expect, test } from "@playwright/test";
import { buildDailyDefinition, buildStageDefinition } from "../../src/features/game/engine";

async function enterName(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByPlaceholder("Puzzle pilot").fill("Tester");
  await page.getByRole("button", { name: "Start playing" }).click();
}

async function arrange(page: import("@playwright/test").Page, target: string[]) {
  for (let index = 0; index < target.length; index += 1) {
    const currentIds = await page.locator("[data-item-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-item-id")));
    if (currentIds[index] === target[index]) continue;
    const swapIndex = currentIds.indexOf(target[index]);
    await page.locator("[data-item-id]").nth(index).click({ force: true });
    await page.locator("[data-item-id]").nth(swapIndex).click({ force: true });
  }
}

async function solveCurrentPuzzle(page: import("@playwright/test").Page, solution: string[]) {
  await arrange(page, solution);
  await page.getByRole("button", { name: /Check Arrangement/i }).click({ force: true });
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
  await page.locator("[data-item-id]").nth(0).click();
  await page.locator("[data-item-id]").nth(1).click();
  await page.getByRole("button", { name: /Check Arrangement/i }).click();
  await expect(page.getByText(/Previous guesses/i)).toBeVisible();
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
