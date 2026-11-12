"""Canonical indicative merchandising values from Ghislaine's 2027 workbook.

Only article definitions and column E's unit value are projected. Agent budgets,
requested quantities and historical deliveries never enter the customer data.
"""
from decimal import Decimal, InvalidOperation
from pathlib import Path
import re
import unicodedata

import openpyxl


SOURCE_FILENAME = 'ELIOS_budget campioni AGENT 2027.xlsx'
SOURCE_SHEETS = ('Elenco merchandising', 'BUDGET 2027')


def normalize(value):
    text = unicodedata.normalize('NFD', str(value or ''))
    return re.sub(r'[^a-z0-9]', '', text.encode('ascii', 'ignore').decode().lower())


def unit_value(value, location):
    """A missing price stays unknown; zero is a legitimate source value."""
    if value is None or value == '':
        return None
    if isinstance(value, bool):
        raise ValueError(f'Invalid merchandising value at {location}')
    try:
        number = Decimal(str(value))
    except InvalidOperation as error:
        raise ValueError(f'Invalid merchandising value at {location}') from error
    if not number.is_finite() or number < 0:
        raise ValueError(f'Invalid merchandising value at {location}')
    return float(number.quantize(Decimal('0.01')))


def read_merchandising(path):
    """Keep the current catalogue's identifiers; the 2027 sheet takes priority.

    A single spreadsheet row is a single instrument, even when its illustration
    is a shared page showing other codes. Do not infer variants from that page.
    """
    path = Path(path)
    workbook = openpyxl.load_workbook(path, data_only=True)
    result = {}
    try:
        for title in SOURCE_SHEETS:
            sheet = workbook[title]
            for index, row in enumerate(sheet.values, 1):
                if not row[0] or not str(row[0]).startswith('E-') or not row[2]:
                    continue
                code = str(row[1] or '').strip()
                key = code or 'sans-code-' + normalize(str(row[0]) + str(row[2]))
                fill = sheet.cell(index, 1).fill
                color = fill.fgColor.rgb if fill.fgColor.type == 'rgb' else ''
                result[key] = {
                    'id': key,
                    'reference': code,
                    'collection': str(row[0])[2:].strip(),
                    'description': str(row[2]).strip().rstrip('.').strip(),
                    'unit': 'pièce',
                    'status': ('Code à confirmer' if not code else
                               'Sur demande' if color == 'FFFFFF00' else
                               'Selon disponibilité'),
                    'sourceSheet': title,
                    'valueUnitHT': unit_value(row[4], f'{title}!E{index}'),
                    'payable': False,
                    'factoryApprovalRequired': True,
                    'priceSource': {
                        'file': SOURCE_FILENAME,
                        'sheet': title,
                        'cell': f'E{index}',
                    },
                }
    finally:
        workbook.close()
    return result


def refresh_catalogue_values(data, merchandising):
    """Add canonical values without replacing images, products or document maps."""
    current = {item['id'] for item in data['merchandising']}
    if current != set(merchandising):
        raise ValueError('Merchandising references changed; run the full reviewed import')
    for item in data['merchandising']:
        source = merchandising[item['id']]
        item['valueUnitHT'] = source['valueUnitHT']
        item['priceSource'] = source['priceSource']
        item['payable'] = False
        item['factoryApprovalRequired'] = True
    data['version'] = '20261112-elios-samples-v2'
    data['budgetYear'] = 2027
    return data
