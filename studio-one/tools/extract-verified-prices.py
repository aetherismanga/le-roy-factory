"""Read public RANDAL prices independently from the source PDF, by table row.

Usage: python tools/extract-verified-prices.py ../site-audit
This does not modify the catalogue, images or commercial source files.
"""
import hashlib
import json
import re
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import fitz

source = Path(sys.argv[1]) / 'assets/pdf/RANDAL%20V04.pdf'
doc = fitz.open(source)
assert len(doc) == 43
entries = {}
for page_number in (36, 38, 41):
    page = doc[page_number - 1]
    assert 'Prix Vente H.T. conseillé' in page.get_text()
    prices = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                match = re.match(r'\s*(\d+(?:[.,]\d+)?)\s*€', span['text'])
                if match:
                    prices.append((span['bbox'], Decimal(match[1].replace(',', '.'))))
    words = page.get_text('words')
    for index, word in enumerate(words[:-1]):
        if word[4] != 'ref.' or not words[index + 1][4].isdigit():
            continue
        reference = words[index + 1]
        x, y = reference[0], (reference[1] + reference[3]) / 2
        # V04: prices and refs share a row on p36/p38. On p41, the
        # reference is immediately below the price in each finish cell.
        candidates = [(rect, value) for rect, value in prices
                      if -5 <= x - rect[0] < (60 if page_number == 41 else 160)
                      and abs(y - (rect[1] + rect[3]) / 2) < (12 if page_number == 41 else 3)]
        assert candidates, (page_number, reference)
        rect, amount = min(candidates, key=lambda row: abs(y - (row[0][1] + row[0][3]) / 2))
        cents = int((amount * 120).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        entry = {'page': page_number, 'publicTTC': cents}
        ref = reference[4]
        assert ref not in entries or entries[ref] == entry, ref
        entries[ref] = entry
assert entries['12741'] == {'page': 36, 'publicTTC': 41640}
assert entries['2171'] == {'page': 38, 'publicTTC': 16320}
assert entries['9567'] == {'page': 41, 'publicTTC': 27120}
result = {'source': str(source.relative_to(Path(sys.argv[1]))),
          'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'rule': 'Public HT printed in the original PDF × 1.20, rounded to cents.',
          'entries': entries}
Path('reports/randal-pdf-prices.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print({page: sum(row['page'] == page for row in entries.values()) for page in (36, 38, 41)})
