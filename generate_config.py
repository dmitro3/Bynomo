import json

with open(r'c:\Users\enliven\Desktop\Binomo\tmp_assets_v2.json', 'r') as f:
    data = json.load(f)

existing = ["BTC", "ETH", "SOL", "TRX", "XRP", "DOGE", "ADA", "BCH", "BNB", "SUI", "XLM", "XTZ", "NEAR", "APT", "AAPL", "GOOGL", "AMZN", "MSFT", "NVDA", "TSLA", "META", "NFLX", "EUR", "GBP", "JPY", "AUD", "CAD", "GOLD", "SILVER", "BYNOMO"]

selected = {}

# 1. Commodities
commodities = {
    "WTI": data.get("WTIJ6"), # Using the futur for now
    "BRENT": data.get("UKOILSPOT"),
    "CORN": data.get("SON6"), # Future
    "WHEAT": data.get("WHZ6"), # Future
    "NATGAS": data.get("TGEQ6"), # Future
}

for k, v in commodities.items():
    if v: selected[k] = v

# 2. Indices
indices = {
    "SPX": data.get("SPX"),
    "NDX": data.get("IVW"), # S&P 500 Growth as proxy if NDX missing
    "DJI": data.get("DIA"),
    "DAX": data.get("GER40"),
    "N225": data.get("N225"),
}

for k, v in indices.items():
    if v: selected[k] = v

# 3. Top Cryptos
cryptos_to_add = ["LINK", "AVAX", "DOT", "LTC", "UNI", "PEPE", "SHIB", "ATOM", "RENDER", "TAO", "INJ", "KAS", "FET", "FIL", "AR", "STX", "HBAR", "ICP", "VET", "OP", "BONK", "ARB", "SNX", "AAVE", "MKR", "GRT", "THETA", "ALGO", "EGLD", "FLOW"]

for c in cryptos_to_add:
    if len(selected) >= 50: break
    if c in data and c not in existing:
        selected[c] = data[c]

# 4. Top Stocks
stocks_to_add = ["AMD", "BABA", "DIS", "JPM", "V", "MA", "PYPL", "COIN", "MSTR", "UBER", "PLTR", "SQ", "CRM", "INTC", "TSM"]
for s in stocks_to_add:
    if len(selected) >= 50: break
    if s in data and s not in existing:
        selected[s] = data[s]

# Fill the rest with any crypto /USD
if len(selected) < 50:
    for k, v in data.items():
        if len(selected) >= 50: break
        if v['asset_type'] == "Crypto" and k not in existing and k not in selected:
            selected[k] = v

output = ""
for k, v in selected.items():
    cat = "Stocks"
    if v['asset_type'] == "Crypto" or "Crypto" in v['asset_type']: cat = "Crypto"
    elif v['asset_type'] == "Commodities" or v['asset_type'] == "Metal": cat = "Metals"
    elif v['asset_type'] == "FX": cat = "Forex"
    elif v['asset_type'] == "Equity": cat = "Stocks" # Indices often listed as Equity or ETF
    
    # Custom logos or generic
    logo = f"/logos/{k.lower()}.png"
    
    line = f"    {k}: {{ name: '{v['name']}', symbol: '{k}', pair: '{k}/USD', decimals: 2, logo: '{logo}', category: '{cat}' }},"
    output += line + "\n"

with open(r'c:\Users\enliven\Desktop\Binomo\asset_config_lines.txt', 'w') as f:
    f.write(output)

# Also generate priceFeed IDs
feed_output = ""
for k, v in selected.items():
    feed_output += f"  {k}: '{v['id']}',\n"

with open(r'c:\Users\enliven\Desktop\Binomo\asset_feed_ids.txt', 'w') as f:
    f.write(feed_output)

print(f"Generated {len(selected)} lines.")
