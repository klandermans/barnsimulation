from pypdf import PdfReader
import re

key_pdfs = ['roblox/B230655-11-B10.pdf', 'roblox/B230655-11-B11.pdf', 'roblox/B230655-11-B14.pdf', 'roblox/B230655-11-B34.pdf', 'roblox/B230655-12-V10.pdf', 'roblox/B230655-12-V35.pdf']

for p in key_pdfs:
    reader = PdfReader(p)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    print(f"\n==================== {p} ====================")
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    # Print lines that mention rooms, numbers, stalls, robots, pens, dimensions
    for l in lines:
        if any(w in l.lower() for w in ['box', 'groep', 'voer', 'robot', 'melk', 'kalf', 'kalv', 'strostal', 'afkalf', 'kantoor', 'skybox', 'wacht', 'selectie', 'behandel', 'mest', 'rooster', 'gang', 'koe', 'lely', 'drink', 'water', 'meter', 'm2', 'trap', 'opslag', 'toilet', 'douche', 'kantine', 'kleed']):
            print(f"  {l}")
