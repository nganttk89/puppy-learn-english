import time
from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Setup localStorage to simulate user playing stage 1 and 2
        mock_player = {
            "playerName": "Player1",
            "progress": {
                "lives": 3,
                "score": 100,
                "completedLevels": [],
                "level1": {"s1": True, "s2": True, "s3": False, "s4": False}
            }
        }
        
        page.goto('http://localhost:8000/index.html')
        page.evaluate(f"localStorage.setItem('findItPlayer', JSON.stringify({json.dumps(mock_player)}));")
        page.evaluate("localStorage.setItem('currentPlayer', 'Player1');")
        
        # Navigate to match.html
        page.goto('http://localhost:8000/match.html?level=level1')
        time.sleep(1)
        
        # Override showGameOver to just call the success modal instantly to test it
        page.evaluate("""
            if (typeof showGameOver === 'function') {
                showGameOver();
            }
        """)
        time.sleep(2) # wait for modal to show and save
        
        # Check localStorage
        saved = page.evaluate("localStorage.getItem('findItPlayer');")
        print("SAVED DATA:", saved)
        
        browser.close()

if __name__ == '__main__':
    run()
