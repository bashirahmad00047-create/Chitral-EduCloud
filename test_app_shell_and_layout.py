import requests
import re
from html.parser import HTMLParser

res = requests.get('http://127.0.0.1:5050/')
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
html = res.text

# 1. HTML Tag Balance Check
class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.self_closing = {'br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'}

    def handle_starttag(self, tag, attrs):
        if tag not in self.self_closing:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag in self.self_closing:
            return
        if not self.stack:
            self.errors.append(f'Unexpected closing tag </{tag}> at line {self.getpos()[0]}')
            return
        last_tag, pos = self.stack.pop()
        if last_tag != tag:
            self.errors.append(f'Mismatched tag: expected </{last_tag}> (opened at {pos}), found </{tag}> at {self.getpos()}')

tc = TagChecker()
tc.feed(html)
print(f"[TEST 1] Tag Balance: {len(tc.stack)} unclosed tags, {len(tc.errors)} mismatched tags")
assert len(tc.stack) == 0, f"Unclosed tags: {tc.stack}"
assert len(tc.errors) == 0, f"Mismatched tags: {tc.errors}"
print("[PASS] 1. Perfect HTML tag balance across rendered document!")

# 2. App Shell Structure
assert 'app-shell-header' in html, "Missing app-shell-header class"
assert 'app-shell-body' in html, "Missing app-shell-body class"
assert 'app-shell-sidebar' in html, "Missing app-shell-sidebar class"
assert 'app-shell-main' in html, "Missing app-shell-main class"
assert 'id="main-content-area"' in html, "Missing id main-content-area"
print("[PASS] 2. Rock-solid App Shell architecture present (header -> app-shell-body [sidebar + main-content-area])!")

# 3. All 13 screens have erp-screen-view
screens = re.findall(r'<section\s+[^>]*id=["\']([^"\']+)["\'][^>]*class=["\']([^"\']+)["\']', html)
print(f"[TEST 3] Found {len(screens)} screen sections:")
for sid, sclass in screens:
    assert 'erp-screen-view' in sclass, f"Screen #{sid} missing erp-screen-view class!"
    print(f"  #{sid}: {sclass.strip()[:60]}")
assert len(screens) == 13, f"Expected 13 screens, found {len(screens)}"
print("[PASS] 3. All 13 screens strictly have .erp-screen-view class!")

# 4. Div tag counts across individual templates
div_open = html.count('<div')
div_close = html.count('</div>')
print(f"[TEST 4] Total DOM <div> count: open={div_open}, close={div_close}, diff={div_open - div_close}")
assert div_open == div_close, f"DIV mismatch: {div_open} open != {div_close} close!"
print("[PASS] 4. Exact match of opening and closing <div> tags across entire DOM!")

print("\n" + "="*70)
print("  APP SHELL & LAYOUT VERIFICATION: 100% SUCCESS!")
print("="*70)
