import json
import os

filepath = r"C:\Users\enliven\.gemini\antigravity\brain\99bb80ce-af12-49ff-977a-9d420e15f192\.system_generated\steps\898\content.md"

# Skip first lines if they contain markdown text
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    json_str = "".join(lines[3:]) # Skip "Source: ..." etc.

try:
    data = json.loads(json_str)
except Exception as e:
    # If not at line 3, try to find the starting [
    start = json_str.find('[')
    if start != -1:
        data = json.loads(json_str[start:])
    else:
        print("Failed to find JSON [")
        exit(1)

assets_needed = [
    "LINK", "LTC", "DOT", "UNI", "PEPE", "SHIB", "ATOM", "RENDER", "TAO", "INJ", 
    "KAS", "FET", "FIL", "AR", "STX", "HBAR", "ICP", "VET", "OP", "BONK",
    "AMD", "BABA", "DIS", "JPM", "V", "MA", "PYPL", "COIN", "MSTR", "UBER", 
    "PLTR", "SQ", "CRM", "INTC", "TSM",
    "SPX", "NDX", "DJI", "DIA", "VIX", "UK100", "DAX", "N225", "HSI", "FTSE100", 
    "CAC40", "GER40",
    "BRENT", "WTI", "NATGAS", "CORN", "WHEAT", "SOY", "SUGAR", "COFFEE"
]

mapping = {}

for item in data:
    id_ = item.get('id')
    attrs = item.get('attributes', {})
    symbol = attrs.get('display_symbol', '')
    base = attrs.get('base', '')
    
    if symbol.endswith('/USD') or symbol in ['SPX', 'NDX', 'DJI', 'VIX', 'DAX', 'N225', 'HSI', 'GER40']:
        found_base = symbol.split('/')[0] if '/' in symbol else symbol
        if found_base in assets_needed:
            mapping[found_base] = {
                "id": "0x" + id_,
                "name": attrs.get('description', found_base),
                "symbol": found_base,
                "asset_type": attrs.get('asset_type', 'Unknown')
            }

# Add UKOILSPOT for BRENT if BRENT not found directly
if "UKOILSPOT" in [item['attributes'].get('base') for item in data]:
    for item in data:
         if item['attributes'].get('base') == "UKOILSPOT":
             mapping["BRENT"] = {
                 "id": "0x" + item['id'],
                 "name": "Brent Crude Oil",
                 "symbol": "BRENT",
                 "asset_type": "Commodities"
             }

# Add WTI spot
if "WTI" not in mapping:
    # Look for UKOIL or similar
    pass

output_file = r"c:\Users\enliven\Desktop\Binomo\tmp_assets.json"
with open(output_file, 'w') as f:
    json.dump(mapping, f, indent=2)

print(f"Extracted {len(mapping)} assets.")
