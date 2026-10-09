import os
from playwright.sync_api import sync_playwright

os.makedirs('screenshots/fresh', exist_ok=True)

def run():
    with sync_playwright() as p:
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        browser = p.chromium.launch(executable_path=chrome_path, headless=True)
        
        pages = [
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

        issues = []

        for page_name, url in pages:
            for vp_name, w, h in viewports:
                page = browser.new_page(viewport={'width': w, 'height': h})
                page.goto(url, wait_until='networkidle')
                page.wait_for_timeout(300)

                # Check horizontal overflow
                overflow = page.evaluate('''() => {
                    return {
                        scrollWidth: document.documentElement.scrollWidth,
                        clientWidth: document.documentElement.clientWidth,
                        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                        overflowElements: Array.from(document.querySelectorAll('*'))
                            .filter(el => {
                                const rect = el.getBoundingClientRect();
                                return rect.right > document.documentElement.clientWidth + 1;
                            })
                            .map(el => ({
                                tag: el.tagName,
                                class: el.className,
                                id: el.id,
                                right: el.getBoundingClientRect().right,
                                width: el.getBoundingClientRect().width
                            }))
                            .slice(0, 5)
                    };
                }''')

                if overflow['hasOverflow']:
                    issues.append(f"OVERFLOW: {page_name} @ {vp_name} ({w}px): scrollWidth {overflow['scrollWidth']} > clientWidth {overflow['clientWidth']}. Culprits: {overflow['overflowElements']}")

                screenshot_path = f"screenshots/fresh/{page_name}_{vp_name}_{w}.png"
                page.screenshot(path=screenshot_path, full_page=True)
                page.close()

        browser.close()

        if issues:
            print("Layout Issues Found:")
            for issue in issues:
                print(" -", issue)
        else:
            print("No horizontal overflow detected across all pages and viewports!")

if __name__ == '__main__':
    run()
