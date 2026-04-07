import json
import os

filepath = r"C:\Users\enliven\Desktop\Binomo\pyth_feeds.json" # Assuming we somehow got it or use the long one

# Let's use the one we already have
filepath = r"C:\Users\enliven\.gemini\antigravity\brain\99bb80ce-af12-49ff-977a-9d420e15f192\.system_generated\steps\898\content.md"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    json_str = "".join(lines[3:]) 

start = json_str.find('[')
data = json.loads(json_str[start:])

mapping = {}

# Priority assets
priorities = ["SPX", "NDX", "DJI", "VIX", "DAX", "UK100", "N225", "HSI", "CAC40", "GER40", "FTSE100", "WTI", "NATGAS", "CORN", "WHEAT", "SOY", "SUGAR", "COFFEE", "XAU", "XAG"]

for item in data:
    id_ = "0x" + item.get('id')
    attrs = item.get('attributes', {})
    symbol = attrs.get('display_symbol', '')
    description = attrs.get('description', '').upper()
    asset_type = attrs.get('asset_type', '')
    
    # Try multiple match strategies
    key = None
    if "/USD" in symbol:
        key = symbol.split('/')[0]
    elif symbol in priorities:
        key = symbol
    elif "S&P 500" in description:
        key = "SPX"
    elif "NASDAQ 100" in description:
        key = "NDX"
    elif "DOW JONES" in description:
        key = "DJI"
    elif "BRENT" in description and asset_type == "Commodities":
        key = "BRENT"
    elif "WTI" in description and asset_type == "Commodities":
        key = "WTI"
    
    if key and key not in mapping:
        mapping[key] = {
            "id": id_,
            "name": attrs.get('description', key),
            "symbol": key,
            "asset_type": asset_type
        }

# If we still need more to reach 50, just take any /USD crypto we don't have
existing_in_app = ["BTC", "ETH", "SOL", "TRX", "XRP", "DOGE", "ADA", "BCH", "BNB", "SUI", "XLM", "XTZ", "NEAR", "APT", "AAPL", "GOOGL", "AMZN", "MSFT", "NVDA", "TSLA", "META", "NFLX", "EUR", "GBP", "JPY", "AUD", "CAD", "GOLD", "SILVER"]

for item in data:
    if len(mapping) >= 100: break # Get plenty
    id_ = "0x" + item.get('id')
    attrs = item.get('attributes', {})
    symbol = attrs.get('display_symbol', '')
    asset_type = attrs.get('asset_type', '')
    
    if asset_type == "Crypto" and "/USD" in symbol:
        key = symbol.split('/')[0]
        if key not in mapping and key not in existing_in_app:
            mapping[key] = {
                "id": id_,
                "name": attrs.get('description', key),
                "symbol": key,
                "asset_type": asset_type
            }

output_file = r"c:\Users\enliven\Desktop\Binomo\tmp_assets_v2.json"
with open(output_file, 'w') as f:
    json.dump(mapping, f, indent=2)

print(f"Extracted {len(mapping)} assets total.")
