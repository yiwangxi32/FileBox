import { expect, test } from "@playwright/test"

test("home routes to toolbox tools", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "多功能文件工具箱" })).toBeVisible()
  await page.getByRole("link", { name: "进入工具" }).first().click()
  await expect(page).toHaveURL(/\/tools\/image-compressor/)
  await expect(page.getByRole("heading", { name: "图片压缩" })).toBeVisible()
})
