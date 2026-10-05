import json

with open('data/zones.json', 'r') as f:
    zones = json.load(f)
    
print("Before:", [z['name'] for z in zones])

# simulate move up for index 1
zones[1], zones[0] = zones[0], zones[1]

print("After:", [z['name'] for z in zones])
