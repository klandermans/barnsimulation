import fitz
import glob
import os

pdf_files = sorted(glob.glob("roblox/*.pdf"))

for pdf_path in pdf_files:
    fname = os.path.basename(pdf_path)
    doc = fitz.open(pdf_path)
    found_lines = []
    for page_idx, page in enumerate(doc):
        text = page.get_text()
        for line in text.splitlines():
            line_str = line.strip()
            if not line_str or len(line_str) < 3: continue
            # Look for meaningful annotations
            low = line_str.lower()
            if any(k in low for k in ['box', 'groep', 'voer', 'robot', 'melk', 'kalf', 'kalv', 'strostal', 'afkalf', 'kantoor', 'skybox', 'wacht', 'selectie', 'behandel', 'mest', 'rooster', 'gang', 'koe', 'lely', 'drink', 'water', 'trap', 'opslag', 'toilet', 'douche', 'kantine', 'kleed', 'spoel', 'berging', 'werktuig', 'krachtvoer', 'vijzel', 'separator', 'mestput', 'spant', 'dakhelling']):
                # Filter out DLV company footer
                if not any(ign in low for ign in ['dlv advies', 'versluis', 'wageningen', 'boksumerdyk', 'drachten']):
                    found_lines.append(f"[p.{page_idx+1}] {line_str}")
    if found_lines:
        print(f"\n=== {fname} ({len(found_lines)} matches) ===")
        for fl in found_lines[:15]:
            print(f"   {fl}")
