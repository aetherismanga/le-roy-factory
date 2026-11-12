import copy
from pathlib import Path
import tempfile
import unittest

import openpyxl

from elios_merchandising_values import read_merchandising, refresh_catalogue_values, unit_value


class MerchandisingValuesTest(unittest.TestCase):
    def test_2027_unit_values_override_older_values_without_agent_allocations(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'input.xlsx'
            workbook = openpyxl.Workbook()
            workbook.active.title = 'Elenco merchandising'
            workbook.active.append(['E-VENERE', 'EVNR15', 'KIT VENERE', 'NR', 220, 9999, 999999])
            sheet = workbook.create_sheet('BUDGET 2027')
            sheet.append(['E-VENERE', 'EVNR15', 'KIT VENERE', 'NR', 200, 700, 140000])
            sheet.append(['E-STONE ICON', None, 'PANNELLO FRANCESE', None, 60, 999, 59940])
            workbook.save(path)
            result = read_merchandising(path)
        item = result['EVNR15']
        self.assertEqual(item['valueUnitHT'], 200)
        self.assertEqual(item['priceSource']['cell'], 'E1')
        self.assertEqual(item['priceSource']['sheet'], 'BUDGET 2027')
        self.assertNotIn('quantity', item)
        self.assertNotIn('700', str(item))
        self.assertNotIn('140000', str(item))
        unknown = result['sans-code-estoneiconpannellofrancese']
        self.assertEqual(unknown['reference'], '')
        self.assertEqual(unknown['valueUnitHT'], 60)
        self.assertEqual(unknown['status'], 'Code à confirmer')

    def test_missing_values_never_become_zero_and_invalid_values_fail(self):
        self.assertIsNone(unit_value(None, 'E1'))
        self.assertIsNone(unit_value('', 'E1'))
        self.assertEqual(unit_value(0, 'E1'), 0)
        for value in [-1, True, 'NaN', 'Infinity', 'sur demande']:
            with self.assertRaises(ValueError):
                unit_value(value, 'E1')

    def test_value_refresh_preserves_exact_images_and_references(self):
        data = {'products': [{'key': 'tile'}], 'documents': [{'codes': ['A', 'B']}],
                'merchandising': [{'id': 'A', 'images': [{'image': 'page.webp'}]}]}
        before = copy.deepcopy(data)
        refresh_catalogue_values(data, {'A': {'valueUnitHT': 44, 'priceSource': {'cell': 'E2'}}})
        self.assertEqual(data['products'], before['products'])
        self.assertEqual(data['documents'], before['documents'])
        self.assertEqual(data['merchandising'][0]['images'], before['merchandising'][0]['images'])
        self.assertEqual(data['merchandising'][0]['valueUnitHT'], 44)
        with self.assertRaises(ValueError):
            refresh_catalogue_values(data, {'B': {'valueUnitHT': 44}})


if __name__ == '__main__':
    unittest.main()
