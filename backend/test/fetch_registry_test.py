"""Offline failure tests for the collector; never write to the product snapshot."""
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('collector', Path(__file__).parents[1] / 'src/scripts/fetch-registry.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class CollectorTests(unittest.TestCase):
    def test_supplement_preserves_old_records_age_and_deduplicates(self):
        old = {'lei':'old', 'groups':['old'], 'contextOnly':False}
        shared = {'lei':'shared', 'groups':['old'], 'contextOnly':False}
        new = {'lei':'new', 'groups':['new'], 'contextOnly':False, 'retrievedAt':'2026-10-27'}
        base = {'entities':[old,shared], 'fetchedAt':'2026-10-23', 'scope':'Reference universe.',
                'seeds':[{'lei':'old'}], 'coverage':[], 'sourcePublishDates':['2026-10-23']}
        extra = {'entities':[new, {**shared, 'groups':['new']}], 'fetchedAt':'2026-10-27',
                 'seeds':[{'lei':'new'}], 'coverage':[], 'sourcePublishDates':['2026-10-27']}
        result = collector.merge_supplement(base,extra)
        self.assertEqual(len(result['entities']),3)
        self.assertEqual(result['fetchedAt'],'2026-10-23')
        self.assertEqual(next(r for r in result['entities'] if r['lei']=='shared')['groups'],['new','old'])
        self.assertEqual(next(r for r in result['entities'] if r['lei']=='old'),old)
        self.assertEqual(len(result['contentHash']),64)
        extra['entities']=[{**shared,'contextOnly':True,'groups':[]}]
        kept=collector.merge_supplement(base,extra)
        self.assertEqual(next(r for r in kept['entities'] if r['lei']=='shared'),shared)

    def test_small_regional_pages_are_checked_without_assuming_100_rows(self):
        collector.verify_cohort_count([None]*50,10000,1,50)
        with self.assertRaisesRegex(ValueError,'Incomplete cohort'):
            collector.verify_cohort_count([None]*49,10000,1,50)

    def test_supplement_keeps_previous_region_metadata(self):
        base={'entities':[], 'fetchedAt':'2026-10-23', 'scope':'Reference.', 'seeds':[], 'coverage':[], 'sourcePublishDates':[], 'cohorts':[{'country':'HK','returned':2000}]}
        extra={**base,'fetchedAt':'2026-10-27','cohorts':[{'country':'US','returned':50}]}
        merged=collector.merge_supplement(base,extra)
        self.assertEqual([c['country'] for c in merged['cohorts']],['HK','US'])
        self.assertEqual(merged['cohorts'][1]['fetchedAt'],'2026-10-27')

    def test_repeated_page_is_rejected(self):
        with patch.object(collector, 'fetch', return_value={'data': [{'id':'a'}], 'links':{'next':'same'}}):
            with self.assertRaisesRegex(ValueError, 'Repeated pagination'):
                collector.pages('same')

    def test_duplicate_rows_are_rejected(self):
        with patch.object(collector, 'fetch', side_effect=[{'data':[{'id':'a'}], 'links':{'next':'second'}}, {'data':[{'id':'a'}]}]):
            with self.assertRaisesRegex(ValueError, 'Duplicate rows'):
                collector.pages('first')

    def test_page_limit_is_not_silently_truncated(self):
        with patch.object(collector, 'fetch', return_value={'data':[{'id':str(i)} for i in range(3001)]}):
            with self.assertRaisesRegex(ValueError, 'safety limit'):
                collector.pages('first')

    def test_whole_batch_counts_context_once_and_rejects_overflow(self):
        self.assertEqual(collector.ensure_capacity(['a','b'],['b','c']),3)
        with self.assertRaisesRegex(ValueError, 'context'):
            collector.ensure_capacity(range(2999),[2999,3000])

    def test_partial_cohort_page_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Incomplete cohort'):
            collector.verify_cohort_count([None]*199,500,2)
        collector.verify_cohort_count([None]*200,500,2)
        collector.verify_cohort_count([None]*150,150,2)

    def test_successful_response_resumes_without_network(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(collector, 'STAGE', Path(folder)), patch.object(collector.time,'sleep'):
            with patch.object(collector.urllib.request, 'urlopen', return_value=io.StringIO('{"data":[]}')) as network:
                first = collector.fetch(collector.BASE + 'resume')
                self.assertEqual(collector.fetch(collector.BASE + 'resume'), first)
                self.assertEqual(network.call_count, 1)

    def test_rate_limit_retries_are_finite_and_do_not_cache_failure(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(collector, 'STAGE', Path(folder)), patch.object(collector.time,'sleep'):
            error = HTTPError(collector.BASE,429,'limited',{'Retry-After':'1'},None)
            with patch.object(collector.urllib.request,'urlopen',side_effect=error) as network:
                with self.assertRaises(HTTPError): collector.fetch(collector.BASE+'limited')
                self.assertEqual(network.call_count,6)
                self.assertEqual(list(Path(folder).glob('*.json')),[])

    def test_failed_batch_leaves_both_published_files_untouched(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(collector,'ROOT',Path(folder)):
            root=Path(folder)
            (root/'seeds.json').write_text('[]')
            (root/'scope.json').write_text(json.dumps({'cohorts':[{'country':'HK','maxPages':20}]}))
            for name in ['gleif-snapshot.json','gleif-source-responses.json']: (root/name).write_text('previous usable batch')
            with patch.object(collector,'fetch',side_effect=RuntimeError('Source unavailable')):
                with self.assertRaises(RuntimeError): collector.main()
            for name in ['gleif-snapshot.json','gleif-source-responses.json']:
                self.assertEqual((root/name).read_text(),'previous usable batch')

if __name__ == '__main__': unittest.main()
