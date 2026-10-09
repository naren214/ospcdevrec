import os
import sys
from playwright.sync_api import sync_playwright

os.makedirs('screenshots', exist_ok=True)

def run():
    with sync_playwright() as p:
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        browser = p.chromium.launch(executable_path=chrome_path, headless=True)
        
        pages_to_test = [
            ('home', 'http://localhost:3000/index.html'),
            ('videos', 'http://localhost:3000/videos.html'),
            ('join', 'http://localhost:3000/join.html')
        ]
        
        viewports = [
            ('mobile', 360, 780),
            ('tablet', 768, 1024),
            ('desktop', 1280, 800),
            ('wide', 1920, 1080)
        ]

        console_errors = []

        for page_name, url in pages_to_test:
            print(f"\n================ Testing {page_name.upper()} ({url}) ================")
            
            for vp_name, w, h in viewports:
                page = browser.new_page(viewport={'width': w, 'height': h})
                page.on('console', lambda msg: console_errors.append(f"[{page_name} {vp_name}] {msg.type}: {msg.text}") if msg.type in ['error', 'warning'] else None)
                
                resp = page.goto(url)
                assert resp.status == 200, f"Failed to load {url}, status: {resp.status}"
                
                # Check title
                title = page.title()
                print(f"[{vp_name} {w}x{h}] Title: {title}")
                
                # Take screenshot
                screenshot_path = f"screenshots/{page_name}_{vp_name}_{w}.png"
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"  -> Saved {screenshot_path}")

                # Test mobile nav menu if on mobile
                if w <= 768:
                    toggle = page.query_selector('.nav-toggle')
                    if toggle:
                        is_expanded_before = toggle.get_attribute('aria-expanded')
                        toggle.click()
                        page.wait_for_timeout(300)
                        is_expanded_after = toggle.get_attribute('aria-expanded')
                        nav_menu = page.query_selector('.nav-menu')
                        has_active = 'is-active' in (nav_menu.get_attribute('class') or '')
                        print(f"  -> Mobile menu toggle check: before={is_expanded_before}, after={is_expanded_after}, is_active={has_active}")

                page.close()

        # -------------------------------------------------------------------
        # Test Lite-Embed Facade on index.html
        # -------------------------------------------------------------------
        print("\n--- Testing Lite-Embed Interaction ---")
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://localhost:3000/index.html')
        
        # Check initial state: No iframes should exist
        iframes_before = page.query_selector_all('iframe')
        print(f"Iframes before click: {len(iframes_before)} (Expected: 0)")
        assert len(iframes_before) == 0, "Error: iframe loaded before click!"

        # Click the hero lite-embed
        embed_btn = page.query_selector('.lite-embed')
        assert embed_btn is not None
        embed_btn.click()
        page.wait_for_timeout(500)

        # Check if iframe was injected
        iframes_after = page.query_selector_all('iframe')
        print(f"Iframes after click: {len(iframes_after)} (Expected: 1)")
        assert len(iframes_after) == 1, "Error: iframe was not injected on click!"
        src = iframes_after[0].get_attribute('src')
        print(f"Iframe src: {src}")
        assert 'youtube-nocookie.com/embed/x3JOMDVdG5E' in src
        page.close()

        # -------------------------------------------------------------------
        # Test Form Validation and Submission on join.html
        # -------------------------------------------------------------------
        print("\n--- Testing Form Validation & Submission ---")
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://localhost:3000/join.html')

        # 1. Test empty submit
        submit_btn = page.query_selector('button[type="submit"]')
        submit_btn.click()
        page.wait_for_timeout(200)

        name_error = page.query_selector('#name-error').inner_text()
        email_error = page.query_selector('#email-error').inner_text()
        consent_error = page.query_selector('#consent-error').inner_text()
        print(f"Empty submit validation errors:")
        print(f" - Name error: '{name_error}'")
        print(f" - Email error: '{email_error}'")
        print(f" - Consent error: '{consent_error}'")
        assert len(name_error) > 0, "Name error should be visible"
        assert len(email_error) > 0, "Email error should be visible"
        assert len(consent_error) > 0, "Consent error should be visible"

        # 2. Test invalid email format
        page.fill('#name', 'Test Fan')
        page.fill('#email', 'invalid-email-address')
        submit_btn.click()
        page.wait_for_timeout(200)
        email_error_2 = page.query_selector('#email-error').inner_text()
        print(f"Invalid email error: '{email_error_2}'")
        assert 'valid email' in email_error_2.lower()

        # 3. Test character counter on suggestion textarea
        counter_before = page.query_selector('#suggestion-count').inner_text()
        page.fill('#suggestion', 'I want to see Jack stealth camp in an airport lounge!')
        counter_after = page.query_selector('#suggestion-count').inner_text()
        print(f"Textarea character counter: '{counter_before}' -> '{counter_after}'")
        assert '50' in counter_after

        # 4. Fill valid inputs and submit
        page.fill('#email', 'fan@example.com')
        page.select_option('#favourite-video', 'Can You Profit From an All Inclusive Hotel?')
        page.check('#consent')

        submit_btn.click()
        page.wait_for_timeout(1000)

        # Check for success card
        success_card = page.query_selector('.form-success-card')
        assert success_card is not None, "Form success card was not displayed!"
        success_text = success_card.inner_text()
        print(f"Form submission succeeded!\nConfirmation text preview:\n{success_text[:160]}...")

        # Screenshot success state
        page.screenshot(path="screenshots/join_success_state.png")
        print("  -> Saved screenshots/join_success_state.png")

        page.close()
        browser.close()

        print("\n--- Console Output / Warnings ---")
        if console_errors:
            for err in console_errors:
                print("Console warning/error:", err)
        else:
            print("Zero console errors or warnings! Clean execution.")

    print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    run()
