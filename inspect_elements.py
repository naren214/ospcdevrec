from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
        browser = p.chromium.launch(executable_path=chrome_path, headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        
        # Check join.html
        page.goto('http://localhost:3000/join.html')
        sub_disp = page.evaluate('() => { const el = document.getElementById("submitted"); return el ? window.getComputedStyle(el).display : "not found"; }')
        print("join.html #submitted display:", sub_disp)

        # Check all badges across pages
        for path in ['/index.html', '/videos.html', '/join.html']:
            page.goto(f'http://localhost:3000{path}')
            badges = page.evaluate('''() => {
                return Array.from(document.querySelectorAll('.badge')).map(b => ({
                    text: b.textContent.trim(),
                    tag: b.tagName,
                    hasDot: !!b.querySelector('.badge-dot'),
                    bg: window.getComputedStyle(b).backgroundColor,
                    color: window.getComputedStyle(b).color,
                    border: window.getComputedStyle(b).border,
                    fontSize: window.getComputedStyle(b).fontSize,
                    padding: window.getComputedStyle(b).padding
                }));
            }''')
            print(f"\nBadges in {path}: ({len(badges)})")
            for b in badges:
                print("  ", b)

        # Check section paddings
        for path in ['/index.html', '/videos.html', '/join.html']:
            page.goto(f'http://localhost:3000{path}')
            sections = page.evaluate('''() => {
                return Array.from(document.querySelectorAll('section')).map((s, i) => ({
                    index: i,
                    classes: s.className,
                    paddingTop: window.getComputedStyle(s).paddingTop,
                    paddingBottom: window.getComputedStyle(s).paddingBottom,
                    inlineBg: s.style.backgroundColor || 'none'
                }));
            }''')
            print(f"\nSections in {path}:")
            for s in sections:
                print("  ", s)

        browser.close()

if __name__ == '__main__':
    inspect()
