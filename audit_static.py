import os
import re
from html.parser import HTMLParser

html_files = ['index.html', 'videos.html', 'join.html']

print("=== DEEP STATIC AUDIT & ACCESSIBILITY PRE-FLIGHT ===")

# --- 1. WCAG AA Contrast Audit ---
def srgb_to_lum(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lum(hex_code):
    r, g, b = hex_to_rgb(hex_code)
    return 0.2126 * srgb_to_lum(r) + 0.7152 * srgb_to_lum(g) + 0.0722 * srgb_to_lum(b)

def contrast(hex1, hex2):
    l1 = lum(hex1)
    l2 = lum(hex2)
    top = max(l1, l2) + 0.05
    bot = min(l1, l2) + 0.05
    return top / bot

with open('assets/css/styles.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Extract key colors from CSS
c_bg = re.search(r'--color-bg:\s*([^;]+);', css_content).group(1).strip()
c_bg_alt = re.search(r'--color-bg-alt:\s*([^;]+);', css_content).group(1).strip()
c_surface = re.search(r'--color-surface:\s*([^;]+);', css_content).group(1).strip()
c_text_main = re.search(r'--color-text-main:\s*([^;]+);', css_content).group(1).strip()
c_text_muted = re.search(r'--color-text-muted:\s*([^;]+);', css_content).group(1).strip()
c_text_faint = re.search(r'--color-text-faint:\s*([^;]+);', css_content).group(1).strip()
c_accent = re.search(r'--color-accent:\s*([^;]+);', css_content).group(1).strip()

print("\n--- Contrast Ratios in Light Mode (WCAG AA >= 4.5:1) ---")
pairings = [
    ('text-main on bg', c_text_main, c_bg),
    ('text-muted on bg', c_text_muted, c_bg),
    ('text-faint on bg', c_text_faint, c_bg),
    ('accent on bg', c_accent, c_bg),
    ('text-main on surface', c_text_main, c_surface),
    ('text-muted on surface', c_text_muted, c_surface),
    ('text-faint on surface', c_text_faint, c_surface),
    ('accent on surface', c_accent, c_surface),
    ('text-main on bg-alt', c_text_main, c_bg_alt),
    ('text-muted on bg-alt', c_text_muted, c_bg_alt),
    ('text-faint on bg-alt', c_text_faint, c_bg_alt),
    ('accent on bg-alt', c_accent, c_bg_alt),
]

for label, fg, bg in pairings:
    cr = contrast(fg, bg)
    assert cr >= 4.5, f"Contrast failure: {label} has ratio {cr:.2f}:1 (< 4.5:1)"
    print(f"  PASS: {label:<24} = {cr:.2f}:1")


# --- 2. Heading Hierarchy Parser ---
class HeadingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings = []
        self.current_tag = None
        self.current_attrs = {}
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        if re.match(r'^h[1-6]$', tag):
            self.current_tag = tag
            self.current_attrs = dict(attrs)
            self.current_text = []

    def handle_endtag(self, tag):
        if tag == self.current_tag:
            text = "".join(self.current_text).strip()
            self.headings.append((int(tag[1]), tag, self.current_attrs, text))
            self.current_tag = None

    def handle_data(self, data):
        if self.current_tag:
            self.current_text.append(data)


for filename in html_files:
    print(f"\n--- Checking {filename} ---")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Check Doctype and lang
    assert '<!DOCTYPE html>' in content, f"Missing DOCTYPE in {filename}"
    assert 'lang="en"' in content, f"Missing lang='en' in {filename}"
    
    # 2. Check title and meta
    m_title = re.search(r'<title>(.*?)</title>', content)
    assert m_title and len(m_title.group(1)) > 10, f"Title too short or missing in {filename}"
    assert '<meta name="description"' in content, f"Missing meta description in {filename}"
    assert '<meta name="viewport"' in content, f"Missing viewport in {filename}"
    assert '<link rel="icon"' in content, f"Missing favicon link in {filename}"

    # 3. Check Headings (exactly 1 h1, strict sequential hierarchy)
    h_parser = HeadingParser()
    h_parser.feed(content)
    h1s = [h for h in h_parser.headings if h[0] == 1]
    assert len(h1s) == 1, f"Expected exactly 1 h1 in {filename}, found {len(h1s)}"

    prev_lvl = 0
    for lvl, tag, attrs, text in h_parser.headings:
        if prev_lvl == 0:
            assert lvl == 1, f"First heading must be H1, found {tag} in {filename}"
        else:
            diff = lvl - prev_lvl
            assert diff <= 1, f"Skipped heading level in {filename}: {prev_lvl} -> {lvl} ('{text}')"
        prev_lvl = lvl
    print(f"  PASS: Strict sequential headings (total: {len(h_parser.headings)}, 0 skipped levels)")

    # 4. Check Skip Link
    assert 'class="skip-link"' in content, f"Missing skip-link in {filename}"
    assert 'id="main"' in content, f"Missing main#main in {filename}"

    # 5. Check Landmarks & ARIA
    assert 'role="banner"' in content, f"Missing role='banner' in {filename}"
    assert 'role="navigation"' in content, f"Missing role='navigation' in {filename}"
    assert 'role="main"' in content, f"Missing role='main' in {filename}"
    assert 'role="contentinfo"' in content, f"Missing role='contentinfo' in {filename}"
    assert 'aria-current="page"' in content, f"Missing aria-current='page' in {filename}"
    print(f"  PASS: Landmarks verified (banner, navigation, main, contentinfo, skip-link, aria-current)")

    # 6. Check Disclaimer
    assert 'Unofficial fan project. Not affiliated with or endorsed by Jack Pembrook.' in content, f"Missing mandatory disclaimer in {filename}"

    # 7. Check Performance & Core Web Vitals
    # - Lite-embed embeds zero iframes initially
    assert '<iframe' not in content, f"Initial iframe detected in {filename}! Facade must load 0 iframes initially."

    # - All images have explicit width, height and alt
    imgs = re.findall(r'<img\s+[^>]*>', content)
    for img in imgs:
        assert 'alt="' in img or "alt=''" in img, f"Image missing alt in {filename}: {img}"
        assert 'width="' in img and 'height="' in img, f"Image missing width/height in {filename}: {img}"

    # - High-priority above-the-fold assets use fetchpriority="high"
    assert 'fetchpriority="high"' in content, f"Above-the-fold assets missing fetchpriority='high' in {filename}"
    print(f"  PASS: Performance & Core Web Vitals (0 initial iframes, explicit image dims, fetchpriority)")

    # 8. Check External Links have rel="noopener noreferrer"
    ext_links = re.findall(r'<a\s+[^>]*href=["\'](http[^"\']+)["\'][^>]*>', content)
    for link in ext_links:
        m = re.search(r'<a\s+[^>]*href=["\']' + re.escape(link) + r'["\'][^>]*>', content)
        tag = m.group(0)
        assert 'rel="noopener noreferrer"' in tag or "rel='noopener noreferrer'" in tag, f"External link missing noopener noreferrer in {filename}: {tag}"

    # 9. Check for duplicate IDs
    ids = re.findall(r'(?<!-)id=["\']([^"\']+)["\']', content)
    assert len(ids) == len(set(ids)), f"Duplicate IDs detected in {filename}"
    print(f"  PASS: {filename} passed all audit checks!")

print("\n=== ALL PAGES & ASSETS PASSED DEEP AUDIT VALIDATION! ===")
