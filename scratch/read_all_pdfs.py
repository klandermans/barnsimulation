import os
import glob
from pypdf import PdfReader

pdf_files = sorted(glob.glob("roblox/*.pdf"))
print(f"Total PDFs found: {len(pdf_files)}")

for pdf_path in pdf_files:
    fname = os.path.basename(pdf_path)
    try:
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        text = ""
        for p in reader.pages:
            t = p.extract_text() or ""
            text += t + "\n"
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        
        # Look for drawing title, scale, date, description
        title_candidates = [l for l in lines if any(k in l.lower() for k in ['plattegrond', 'doorsnede', 'gevel', 'inrichting', 'situatie', 'overzicht', 'verdieping', 'detail'])]
        
        print(f"\n=== {fname} ({num_pages}p) ===")
        # Print first few matches or relevant lines
        for tc in title_candidates[:5]:
            print(f"   * {tc}")
        if not title_candidates:
            print(f"   (No keywords, sample lines: {lines[:4]})")
    except Exception as e:
        print(f"Error reading {fname}: {e}")
