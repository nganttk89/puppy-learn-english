import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000/match.html?level=level1')
        time.sleep(2)
        page.screenshot(path='match_bug.png')
        browser.close()

run()
