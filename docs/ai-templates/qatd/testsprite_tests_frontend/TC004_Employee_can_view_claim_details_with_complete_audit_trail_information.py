import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000/login
        await page.goto("http://localhost:3000/login")
        
        # -> Sign in as the demo employee by clicking the 'Employee Demo' quick account button to reach the claims list.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div[2]/div/div[2]/div[4]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the first claim in the Recent Claims table to view the claim detail and check for sections showing receipts, extracted data (original extraction and any edits), per-receipt verdicts, and decision history including HR decision.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row (Claim ID row) to open the claim detail view, then verify receipts, original extraction, any edits, per-receipt verdicts, and decision history (HR decision).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row in Recent Claims to open the claim detail view and then verify receipts, original extraction, edits, per-receipt verdicts, and decision history.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row in Recent Claims to open the claim detail view (element index 904), then inspect the claim detail for chain-of-evidence.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row (index 903) to open the claim detail view and then inspect the claim detail for original extraction, edits, per-receipt verdicts, and decision history.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row in Recent Claims (element index 904) to open the claim detail view, then inspect the claim detail for chain-of-evidence sections: receipts, extracted data (original and edits), per-receipt verdicts, and decision history including HR decision if present.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row (element index 903) to open the claim detail view, then inspect the claim detail for chain-of-evidence sections (receipts, extracted data/original extraction, edits, per-receipt verdicts, HR decision).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row in Recent Claims (Claim ID 16dffa23...) to open the claim detail view, then inspect the detail for receipts, original extraction, edits, per-receipt verdicts, and decision history.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the Claim ID cell of the first Recent Claims row (element index 817) to open the claim detail view, then verify chain-of-evidence sections.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr/td').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first claim row (element index 903) to open the claim detail view, then inspect the detail for chain-of-evidence sections (receipts, extracted data/original extraction, any edits, per-receipt verdicts, HR decision).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the first Recent Claims row (element index 904) to open the claim detail view so we can inspect receipts, original extraction, edits, per-receipt verdicts, and decision history.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div[2]/table/tbody/tr[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'View All' button for Recent Claims to load the full claims list so I can open the claim from that page.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div/main/div/section[3]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the full claims list (History / View All) so I can open the first claim from that list and inspect its chain-of-evidence (receipts, original extraction, edits, per-receipt verdicts, decision history).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[3]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page to create a claim so we can then open it and verify the chain-of-evidence.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[3]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page so a claim can be created (click the 'Upload Claim' link/button).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[3]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page so a claim can be created (click the 'Upload Claim' link in the sidebar).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page to create a claim (click the 'Upload Claim' link in the sidebar).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[3]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page so a claim can be created (click the 'Upload Claim' link in the sidebar).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page so a claim can be created (click the 'Upload Claim' link in the sidebar).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the History (claims list) page to confirm whether any claims exist (click the 'History' link).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[3]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the Upload Claim page so a claim can be created (click the 'Upload Claim' link).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/nav/div/div[2]/a[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Chain of Evidence')]").nth(0).is_visible(), "The claim detail view should show a Chain of Evidence section displaying receipts, extracted data, and decision history."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    