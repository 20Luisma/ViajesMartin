import { test, expect } from '@playwright/test';

test.describe('Vuelos Martín — Flujo E2E Real', () => {
  test('carga el radar principal, filtra vuelos y cambia a Mis Viajes + Copiloto', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/index.html');
    await expect(page.locator('h1.brand-title')).toHaveText('Vuelos Martín');
    await expect(page.locator('#dealsCountBadge')).toContainText('vuelos encontrados');

    // Filtrar por búsqueda inexistente (camino negativo UI)
    await page.fill('#searchInput', 'ZZZDESTINO_INEXISTENTE');
    await expect(page.locator('.empty-title')).toContainText('Sin vuelos con estos filtros');

    // Limpiar búsqueda y cambiar a vista Mis Viajes
    await page.fill('#searchInput', '');
    await page.click('#navTripsBtn');
    await expect(page.locator('#tripsView')).toBeVisible();

    // Abrir y cerrar drawer del Copiloto IA
    await page.click('#openCopilotBtn');
    await expect(page.locator('#copilotDrawerOverlay')).toHaveClass(/open/);
    await page.click('#closeCopilotBtn');
    await expect(page.locator('#copilotDrawerOverlay')).not.toHaveClass(/open/);

    expect(pageErrors).toEqual([]);
  });

  test('camino negativo: 404 en ruta inexistente y 401 en API sin autenticación', async ({ request }) => {
    const res404 = await request.get('/ruta-que-no-existe-404');
    expect(res404.status()).toBe(404);

    const res401 = await request.get('/api.php?action=scan');
    expect(res401.status()).toBe(401);
    const body = await res401.json();
    expect(body.status).toBe(false);
  });
});
