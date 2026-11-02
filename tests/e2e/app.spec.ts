import { test, expect } from '@playwright/test';

test.describe('Flujo de la App de Armador de PC', () => {
  test('La app carga correctamente', async ({ page }) => {
    await page.goto('/');

    // Verificar que el título principal de la app se muestra
    await expect(page).toHaveTitle(/Armador de PC/);

    // Esperar a que algún componente visual o texto se renderice (ej: Armá tu PC o el header)
    const headerTitle = page.getByRole('heading', { name: /Armador de PC/i });
    if (await headerTitle.isVisible()) {
      await expect(headerTitle).toBeVisible();
    }
  });

  test('El optimizador sugiere builds', async ({ page }) => {
    await page.goto('/');

    // Buscar y abrir el optimizador en el header
    const optButton = page.getByRole('button', { name: /Armá por presupuesto/i });
    await expect(optButton).toBeVisible();
    await optButton.click();

    // Llenar un presupuesto básico y enviar
    const budgetInput = page.locator('input#optimizer-budget');
    await expect(budgetInput).toBeVisible();
    await budgetInput.fill('1500000');

    // Hacer clic en sugerir builds (botón de submit o el que diga Optimizar / Armá)
    const submitButton = page.locator('button', { hasText: /Armá mis builds/i }).first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Esperar a ver propuestas generadas (por ejemplo el botón "Aplicar esta build")
    const applyButton = page.getByRole('button', { name: /Aplicar esta build/i }).first();
    await expect(applyButton).toBeVisible({ timeout: 15000 });
  });

  test('Selección manual de componentes', async ({ page }) => {
    await page.goto('/');

    // Hacer click en "Empezar de cero"
    const startButton = page.getByRole('button', { name: /Empezar de cero/i });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Abrir el catálogo de CPU (Procesador)
    const cpuCategory = page.locator('button.flex.min-w-0.flex-1.items-start').first();
    await expect(cpuCategory).toBeVisible();
    await cpuCategory.click();

    // Seleccionar el primer componente disponible en la lista
    const addComponentButton = page.getByRole('button', { name: /Agregar .* a la build/i }).first();
    await expect(addComponentButton).toBeVisible();
    await addComponentButton.click();

    // Verificar que aparece el total de la build
    const totalText = page.getByText(/Total de la build/i);
    await expect(totalText).toBeVisible();
  });
});
