import os
import sys
from playwright.sync_api import sync_playwright

def run_tests():
    chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome_path, headless=True)

        print("\n=======================================================")
        print("1. COMPREHENSIVE FORM UX & INTERACTION TESTS")
        print("=======================================================")
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://localhost:3000/join.html')
        page.wait_for_load_state('domcontentloaded')

        # Check novalidate added dynamically by JS for progressive enhancement
        novalidate_attr = page.eval_on_selector('#join-form', 'el => el.hasAttribute("novalidate")')
        print(f"Dynamic JS progressive enhancement novalidate set: {novalidate_attr}")
        assert novalidate_attr is True

        # Test empty submit validation feedback
        page.click('button[type="submit"]')
        page.wait_for_timeout(200)

        status_text = page.inner_text('#form-status')
        status_role = page.get_attribute('#form-status', 'role')
        status_live = page.get_attribute('#form-status', 'aria-live')
        print(f"Form status banner: '{status_text}' (role={status_role}, aria-live={status_live})")
        assert 'Please correct' in status_text
        assert status_role == 'alert'
        assert status_live == 'assertive'

        name_err = page.inner_text('#name-error')
        name_invalid = page.get_attribute('#name', 'aria-invalid')
        print(f"Name error on empty submit: '{name_err}' (aria-invalid={name_invalid})")
        assert len(name_err) > 0 and name_invalid == 'true'

        consent_err = page.inner_text('#consent-error')
        consent_invalid = page.get_attribute('#consent', 'aria-invalid')
        print(f"Consent error on empty submit: '{consent_err}' (aria-invalid={consent_invalid})")
        assert len(consent_err) > 0 and consent_invalid == 'true'

        # Test clear error removal on input correction
        print("\n--- Testing instant error removal on user correction ---")
        page.fill('#name', 'Jordan Taylor')
        name_err_after = page.inner_text('#name-error')
        name_invalid_after = page.get_attribute('#name', 'aria-invalid')
        print(f"Name error after typing: '{name_err_after}' (aria-invalid={name_invalid_after})")
        assert name_err_after == '' and name_invalid_after is None

        # Checkbox error removal on change
        page.check('#consent')
        consent_err_after = page.inner_text('#consent-error')
        consent_invalid_after = page.get_attribute('#consent', 'aria-invalid')
        print(f"Consent error after checking: '{consent_err_after}' (aria-invalid={consent_invalid_after})")
        assert consent_err_after == '' and consent_invalid_after is None

        # Correct email
        page.fill('#email', 'jordan@example.com')
        # All errors now resolved: check if top-level form-status banner cleared
        status_visible_after = 'is-visible' in (page.get_attribute('#form-status', 'class') or '')
        print(f"Top-level status banner visible after correcting all errors: {status_visible_after}")
        assert not status_visible_after

        # Test character counter edge cases
        print("\n--- Testing Character Counter Edge Cases ---")
        # 1. Normal text
        page.fill('#suggestion', 'Short text')
        count_normal = page.inner_text('#suggestion-count')
        color_normal = page.eval_on_selector('#suggestion-count', 'el => window.getComputedStyle(el).color')
        print(f"Normal counter (10 chars): '{count_normal}', color: {color_normal}")
        assert count_normal == '10 / 500'

        # 2. Near limit (>= 480 chars)
        near_limit_text = 'A' * 485
        page.fill('#suggestion', near_limit_text)
        count_near = page.inner_text('#suggestion-count')
        color_near = page.eval_on_selector('#suggestion-count', 'el => el.style.color')
        print(f"Near-limit counter (485 chars): '{count_near}', style.color: {color_near}")
        assert count_near == '485 / 500'
        assert 'color-accent' in color_near

        # 3. Over limit (> 500 chars)
        over_limit_text = 'B' * 510
        page.evaluate(f'document.getElementById("suggestion").value = "{over_limit_text}"; document.getElementById("suggestion").dispatchEvent(new Event("input"));')
        count_over = page.inner_text('#suggestion-count')
        color_over = page.eval_on_selector('#suggestion-count', 'el => el.style.color')
        print(f"Over-limit counter (510 chars): '{count_over}', style.color: {color_over}")
        assert 'over limit' in count_over
        assert 'color-error' in color_over

        # Verify over-limit validation blocks submission
        page.click('button[type="submit"]')
        page.wait_for_timeout(200)
        sugg_err = page.inner_text('#suggestion-error')
        print(f"Suggestion error on submit when > 500: '{sugg_err}'")
        assert 'not exceed 500' in sugg_err

        # Reset suggestion to valid text
        page.fill('#suggestion', 'Explore an abandoned underground fortress for 24 hours.')

        # Test submit loading state and warm success state
        print("\n--- Testing Submit Loading State & Warm Success Presentation ---")
        # Delay the response slightly so we can assert the in-flight loading spinner
        page.route('**/api/submit', lambda route: page.wait_for_timeout(300) or route.fulfill(status=200, body='{"ok": true}'))

        submit_btn = page.query_selector('button[type="submit"]')
        # Dispatch click without waiting for navigation
        submit_btn.click(no_wait_after=True)
        page.wait_for_timeout(50)
        
        # Check loading spinner & disabled state while request is in flight
        btn_disabled = page.eval_on_selector('button[type="submit"]', 'el => el.disabled')
        has_spinner = page.eval_on_selector('button[type="submit"] .spinner', 'el => el !== null')
        is_submitting_text = page.inner_text('button[type="submit"]')
        print(f"Submit button in flight: disabled={btn_disabled}, spinner present={has_spinner}, text='{is_submitting_text}'")
        assert btn_disabled is True
        assert has_spinner is True

        page.wait_for_timeout(600)

        # Success card validation
        success_card = page.query_selector('.form-success-card')
        assert success_card is not None
        success_heading = page.inner_text('.form-success-card h2')
        print(f"Warm greeting heading: '{success_heading}'")
        assert 'Welcome aboard, Jordan Taylor!' in success_heading

        # Check focus placed on success card
        active_id = page.evaluate('document.activeElement.id')
        print(f"Active focused element after success: '{active_id}'")
        assert active_id == 'success-message'

        # Check localStorage persistence
        saved_records = page.evaluate('JSON.parse(localStorage.getItem("ospc_fan_submissions") || "[]")')
        print(f"LocalStorage saved records count: {len(saved_records)}")
        assert len(saved_records) >= 1
        assert saved_records[-1]['name'] == 'Jordan Taylor'
        assert saved_records[-1]['email'] == 'jordan@example.com'

        page.close()

        print("\n=======================================================")
        print("2. KEYBOARD & ACCESSIBILITY INTERACTION TESTS")
        print("=======================================================")
        
        # Test Mobile Navigation Escape Key & Focus Trapping
        print("\n--- Testing Mobile Nav Keyboard Interaction & Focus Trap ---")
        mobile_page = browser.new_page(viewport={'width': 375, 'height': 667})
        mobile_page.goto('http://localhost:3000/index.html')
        
        toggle_btn = mobile_page.query_selector('.nav-toggle')
        toggle_btn.focus()
        toggle_btn.click() # Open menu
        mobile_page.wait_for_timeout(300)

        is_expanded = toggle_btn.get_attribute('aria-expanded')
        print(f"Mobile nav expanded state: {is_expanded}")
        assert is_expanded == 'true'

        # Test Escape key closes menu and returns focus
        mobile_page.keyboard.press('Escape')
        mobile_page.wait_for_timeout(300)
        is_expanded_esc = toggle_btn.get_attribute('aria-expanded')
        focused_after_esc = mobile_page.evaluate('document.activeElement.className')
        print(f"After Escape: expanded={is_expanded_esc}, focused element class='{focused_after_esc}'")
        assert is_expanded_esc == 'false'
        assert 'nav-toggle' in focused_after_esc

        # Test Focus Trap: Open menu again
        toggle_btn.click()
        mobile_page.wait_for_timeout(300)

        # Tab through the links to the last item ("Join the List" button)
        mobile_page.keyboard.press('Tab') # Home
        mobile_page.keyboard.press('Tab') # Videos
        mobile_page.keyboard.press('Tab') # Join
        mobile_page.keyboard.press('Tab') # Join the List (last item)

        last_focused_text = mobile_page.evaluate('document.activeElement.innerText')
        print(f"Last focusable element in menu: '{last_focused_text}'")
        assert 'Join the List' in last_focused_text

        # Next Tab should wrap back to toggle_btn!
        mobile_page.keyboard.press('Tab')
        wrapped_element_class = mobile_page.evaluate('document.activeElement.className')
        print(f"After Tab on last element, wrapped to: '{wrapped_element_class}'")
        assert 'nav-toggle' in wrapped_element_class

        # Shift+Tab from toggle_btn should wrap to last element in menu!
        mobile_page.keyboard.press('Shift+Tab')
        wrapped_back_text = mobile_page.evaluate('document.activeElement.innerText')
        print(f"After Shift+Tab on toggle button, wrapped back to: '{wrapped_back_text}'")
        assert 'Join the List' in wrapped_back_text

        mobile_page.close()

        # Test Lite-Embed Keyboard Triggers (Space & Enter)
        print("\n--- Testing Lite-Embed Keyboard Activation (Space & Enter) ---")
        desktop_page = browser.new_page(viewport={'width': 1280, 'height': 800})
        desktop_page.goto('http://localhost:3000/videos.html')

        embeds = desktop_page.query_selector_all('.lite-embed')
        print(f"Total lite-embed facades on videos.html: {len(embeds)}")
        assert len(embeds) == 12

        # Test 1: Space key triggers first embed
        embed1 = embeds[0]
        embed1.focus()
        print(f"Focused embed 1 (role={embed1.get_attribute('role')}, tabindex={embed1.get_attribute('tabindex')})")
        desktop_page.keyboard.press('Space')
        desktop_page.wait_for_timeout(500)

        iframe1 = embed1.query_selector('iframe')
        assert iframe1 is not None, "Space key did not activate lite-embed iframe!"
        print(f"Space key activated embed 1! Iframe src: {iframe1.get_attribute('src')[:60]}...")
        # Check clean semantic transition
        assert embed1.get_attribute('role') is None
        assert embed1.get_attribute('tabindex') is None

        # Test 2: Enter key triggers second embed
        embed2 = embeds[1]
        embed2.focus()
        print(f"Focused embed 2 (role={embed2.get_attribute('role')}, tabindex={embed2.get_attribute('tabindex')})")
        desktop_page.keyboard.press('Enter')
        desktop_page.wait_for_timeout(500)

        iframe2 = embed2.query_selector('iframe')
        assert iframe2 is not None, "Enter key did not activate lite-embed iframe!"
        print(f"Enter key activated embed 2! Iframe src: {iframe2.get_attribute('src')[:60]}...")
        assert embed2.get_attribute('role') is None
        assert embed2.get_attribute('tabindex') is None

        desktop_page.close()

        print("\n=======================================================")
        print("3. EDGE CASES: NO-JS FALLBACK & OFFLINE HANDLING")
        print("=======================================================")
        
        # Test Query Param ?submitted=1
        print("\n--- Testing ?submitted=1 query param on join.html ---")
        param_page = browser.new_page(viewport={'width': 1280, 'height': 800})
        param_page.goto('http://localhost:3000/join.html?submitted=1')
        param_card = param_page.query_selector('.form-success-card')
        assert param_card is not None
        print(f"?submitted=1 successfully rendered success card: '{param_card.inner_text()[:60]}...'")
        param_page.close()

        # Test No-JS Fallback using #submitted CSS target with JS disabled!
        print("\n--- Testing pure CSS #submitted :target with JavaScript DISABLED ---")
        no_js_context = browser.new_context(viewport={'width': 1280, 'height': 800}, java_script_enabled=False)
        no_js_page = no_js_context.new_page()
        no_js_page.goto('http://localhost:3000/join.html#submitted')
        
        # Target card should be visible via CSS display: flex
        target_display = no_js_page.eval_on_selector('#submitted', 'el => window.getComputedStyle(el).display')
        form_display = no_js_page.eval_on_selector('#join-form', 'el => window.getComputedStyle(el).display')
        print(f"No-JS #submitted card display: {target_display}")
        print(f"No-JS form display: {form_display}")
        assert target_display == 'flex', f"Expected display: flex, got {target_display}"
        assert form_display == 'none', f"Expected form to be hidden, got {form_display}"

        no_js_context.close()
        browser.close()

    print("\n=======================================================")
    print("ALL INTERACTION, ACCESSIBILITY & UX TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    run_tests()
