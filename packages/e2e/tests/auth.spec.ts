import { expect, test } from "@playwright/test";
import { apiBaseUrl, demoUser, resetDemoData } from "../helpers/demo-data";

test.describe("authentication", () => {
  test.beforeEach(() => {
    resetDemoData();
  });

  test("rejects login with the wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(demoUser.email);
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("returns 401 for an unauthenticated protected API request", async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/products?page=1&limit=6&search=`);

    expect(response.status()).toBe(401);
    await expect(response).not.toBeOK();

    const body = (await response.json()) as {
      message?: string;
      statusCode?: number;
    };

    expect(body.statusCode).toBe(401);
    expect(body.message).toBe("Authentication required");
  });
});
