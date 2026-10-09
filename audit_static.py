import os
import re

html_files = ['index.html', 'videos.html', 'join.html']

print("=== STATIC AUDIT & ACCESSIBILITY PRE-FLIGHT ===")

for filename in html_files:
    print(f"\n--- Checking {filename} ---")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Check Doctype and lang
    assert '<!DOCTYPE html>' in content, "Missing DOCTYPE"
    assert 'lang="en"' in content, "Missing lang='en'"
    
    # 2. Check title and meta
    m_title = re.search(r'<title>(.*?)</title>', content)
    print("Title:", m_title.group(1) if m_title else "MISSING")
    assert m_title and len(m_title.group(1)) > 10, "Title too short or missing"

    assert '<meta name="description"' in content, "Missing meta description"
    assert '<meta name="viewport"' in content, "Missing viewport"
    assert '<link rel="icon"' in content, "Missing favicon link"

    # 3. Check Headings (exactly 1 h1)
    h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL)
    print(f"H1 count: {len(h1s)}")
    assert len(h1s) == 1, f"Expected exactly 1 h1, found {len(h1s)}"

    # 4. Check Skip Link
    assert 'class="skip-link"' in content, "Missing skip-link"
    assert 'id="main"' in content, "Missing main#main"

    # 5. Check Landmarks
    assert '<header' in content, "Missing <header>"
    assert '<nav' in content, "Missing <nav>"
    assert '<main' in content, "Missing <main>"
    assert '<footer' in content, "Missing <footer>"

    # 6. Check Disclaimer
    assert 'Unofficial fan project. Not affiliated with or endorsed by Jack Pembrook.' in content, "Missing mandatory disclaimer"

    # 7. Check Active Nav aria-current="page"
    assert 'aria-current="page"' in content, "Missing aria-current='page' on active nav link"

    # 8. Check Images have alt attribute
    imgs = re.findall(r'<img\s+[^>]*>', content)
    for img in imgs:
        assert 'alt="' in img or "alt=''" in img, f"Image missing alt: {img}"
        assert 'width="' in img and 'height="' in img, f"Image missing width/height: {img}"

    # 9. Check External Links have rel="noopener noreferrer"
    ext_links = re.findall(r'<a\s+[^>]*href=["\'](http[^"\']+)["\'][^>]*>', content)
    for link in ext_links:
        # verify noopener
        m = re.search(r'<a\s+[^>]*href=["\']' + re.escape(link) + r'["\'][^>]*>', content)
        tag = m.group(0)
        assert 'rel="noopener noreferrer"' in tag or "rel='noopener noreferrer'" in tag, f"External link missing noopener noreferrer: {tag}"

    print(f"PASS: {filename} passed all static checks!")

print("\n=== ALL PAGES PASSED VALIDATION! ===")
