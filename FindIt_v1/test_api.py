import urllib.request
import json
import urllib.error

# Fetch current zones
try:
    with open('data/zones.json', 'r') as f:
        zones = json.load(f)
except Exception as e:
    print("Error reading zones:", e)
    exit(1)
    
print("Before:", [z['name'] for z in zones[:3]])

# Swap
zones[0], zones[1] = zones[1], zones[0]

# POST to API
req = urllib.request.Request('http://localhost:8000/api/save-zones', 
                           data=json.dumps(zones).encode('utf-8'),
                           headers={'Content-Type': 'application/json'},
                           method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print("Status code:", response.status)
        print("Response:", response.read().decode())
except urllib.error.URLError as e:
    print("Failed to call API:", e)

# Read again
with open('data/zones.json', 'r') as f:
    new_zones = json.load(f)
print("After API:", [z['name'] for z in new_zones[:3]])
