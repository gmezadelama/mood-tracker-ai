import { expect, test } from "@playwright/test";

test("loads the bootstrap page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Mood Tracker AI" }),
  ).toBeVisible();
});
