"""Reproducible bounded GLEIF snapshot. Standard library only; no inferred ownership.
Scope: seed entities + two generations of reported direct children + their direct/ultimate parents.
Atomic publish after successful retrieval; preserve source responses and a deterministic content hash.
"""
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import time
import threading
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2] / 'registry-data'
BASE = 'https://api.gleif.org/api/v1/lei-records/'
raw = {}
START = time.monotonic()
STAGE = ROOT / '.fetch-stage'
STAGE.mkdir(exist_ok=True)
RATE_LOCK = threading.Lock()
NEXT_REQUEST = 0.0
NETWORK_REQUESTS = 0
CACHE_HITS = 0
RETRY_COUNT = 0

def fetch(url):
    global NETWORK_REQUESTS, CACHE_HITS, NEXT_REQUEST, RETRY_COUNT
    cached = STAGE / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    if cached.exists() and time.time()-cached.stat().st_mtime < 3600:
        result=json.loads(cached.read_text()); raw[url]=result; CACHE_HITS+=1; return result
    if not (url.startswith(BASE) or url.startswith(BASE.rstrip('/') + '?')):
        raise ValueError('Unexpected source URL')
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'CommercialDA-EntityGovernance/2.0', 'Accept': 'application/vnd.api+json'})
            with RATE_LOCK:
                wait=max(0,NEXT_REQUEST-time.monotonic())
                NEXT_REQUEST=max(NEXT_REQUEST,time.monotonic())+0.6
            if wait: time.sleep(wait)
            NETWORK_REQUESTS += 1
            with urllib.request.urlopen(req, timeout=40) as response:
                result = json.load(response)
            cached.write_text(json.dumps(result))
            raw[url] = result
            return result
        except urllib.error.HTTPError as error:
            if error.code not in (429,500,502,503,504) or attempt == 5: raise
            try: delay=float(error.headers.get('Retry-After',''))
            except ValueError: delay=30*(attempt+1) if error.code==429 else 2**attempt
            RETRY_COUNT += 1
            delay=max(1,min(delay,180))
            with RATE_LOCK: NEXT_REQUEST=max(NEXT_REQUEST,time.monotonic()+delay)
            print('Source retry:',error.code,'backoff seconds',delay,flush=True)
            time.sleep(delay)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 5: raise
            time.sleep(2 ** attempt)

def ensure_capacity(entity_ids, context_ids=()):
    total = len(set(entity_ids) | set(context_ids))
    if total > 3000: raise ValueError('Whole batch including parent context exceeds 3000')
    return total

def verify_cohort_count(collected, source_total, max_pages, page_size=100):
    if len(collected) != min(source_total, max_pages * page_size):
        raise ValueError('Incomplete cohort pagination; do not publish a partial sample')

def pages(url):
    result = []
    seen_pages = set()
    seen_ids = set()
    while url:
        if url in seen_pages: raise ValueError('Repeated pagination URL')
        seen_pages.add(url)
        response = fetch(url)
        ids = [r['id'] for r in response['data']]
        if len(set(ids)) != len(ids) or seen_ids.intersection(ids): raise ValueError('Duplicate rows across source pages')
        seen_ids.update(ids)
        result.extend(response['data'])
        if len(result) > 3000: raise ValueError('Scope exceeds workspace safety limit; do not silently truncate')
        url = response.get('links', {}).get('next')
    return result

def seed_bundle(seed):
    record = fetch(BASE + seed['lei'])['data']
    rels = record.get('relationships', {})
    url = rels.get('direct-children', {}).get('links', {}).get('related')
    children = pages(url + '?page[size]=200') if url else []
    print(seed['label'], len(children), 'reported direct children', flush=True)
    return seed, record, children

def merge_supplement(base, supplement):
    """Keep the old reference universe and its age; only refreshed records get a new date."""
    records = {r['lei']: r for r in base['entities']}
    for row in supplement['entities']:
        previous = records.get(row['lei'])
        if previous and row['contextOnly'] and not previous['contextOnly']:
            continue
        if previous:
            row = {**row, 'groups': sorted(set(previous['groups']) | set(row['groups'])),
                   'contextOnly': previous['contextOnly'] and row['contextOnly']}
        records[row['lei']] = row
    ensure_capacity(records)
    merged = {**base, 'entities': [records[k] for k in sorted(records)]}
    for key, identity in [('seeds', 'lei'), ('coverage', 'lei')]:
        values = {v[identity]: v for v in base[key]}
        values.update({v[identity]: v for v in supplement[key]})
        merged[key] = list(values.values())
    cohort_map = {c['country']: c for c in base.get('cohorts', [])}
    for c in supplement.get('cohorts', []):
        cohort_map[c['country']] = {**c, 'fetchedAt': supplement['fetchedAt']}
    merged['cohorts'] = list(cohort_map.values())
    merged['sourcePublishDates'] = sorted(set(base['sourcePublishDates']) | set(supplement['sourcePublishDates']))
    merged['supplementalBatches'] = [*base.get('supplementalBatches', []), {
        'fetchedAt': supplement['fetchedAt'], 'seeds': [s['lei'] for s in supplement['seeds']],
        'entities': len(supplement['entities'])}]
    merged['scope'] = base['scope'].split(' Supplemented with')[0] + ' Supplemented with company and regional reference samples; the base retrieval date is retained. Per-record retrieval dates identify refreshed records. Not a list of Bilibili clients.'
    merged['contentHash'] = hashlib.sha256(json.dumps(merged['entities'], sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    return merged

def main(supplement_seeds=None, supplement_scope=None):
    supplement = bool(supplement_seeds or supplement_scope)
    seeds = [] if supplement_scope and not supplement_seeds else json.loads((Path(supplement_seeds) if supplement_seeds else ROOT / 'seeds.json').read_text())
    records, groups, seed_coverage = {}, {}, []
    first_generation_ids = set()
    cohort_config = json.loads(Path(supplement_scope).read_text()) if supplement_scope else ({'cohorts': []} if supplement_seeds else json.loads((ROOT / 'scope.json').read_text()))
    cohort_ids = set()
    cohorts = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for seed, record, children in pool.map(seed_bundle, seeds):
            for row in [record, *children]:
                records[row['id']] = row
                groups.setdefault(row['id'], set()).add(seed['lei'])
            first_generation_ids.update(row['id'] for row in children)
            seed_coverage.append({'lei': seed['lei'], 'reportedDirectChildren': len(children)})

    # Expand one more generation, not an arbitrary target record count.
    first_generation = [row for lei, row in records.items() if lei in first_generation_ids]
    frontier_groups = {row['id']: set(groups[row['id']]) for row in first_generation}
    def second_generation(row):
        url = row.get('relationships', {}).get('direct-children', {}).get('links', {}).get('related')
        return row['id'], pages(url + '?page[size]=200') if url else []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for parent, children in pool.map(second_generation, first_generation):
            seed_coverage.append({'lei': parent, 'reportedDirectChildren': len(children)})
            for child in children:
                records[child['id']] = child
                groups.setdefault(child['id'], set()).update(frontier_groups[parent])
            if len(records) > 3000: raise ValueError('Scope exceeds 3000 entities')
    print('Two-generation scope:', len(records), 'entities', flush=True)

    # Bounded reference universe: separate from group membership, never infer a client list.
    from urllib.parse import urlencode
    for cohort in cohort_config['cohorts']:
        page_size = cohort.get('pageSize', 100)
        if not isinstance(page_size, int) or not 1 <= page_size <= 100: raise ValueError('pageSize must be 1..100')
        if not isinstance(cohort['maxPages'], int) or not 1 <= cohort['maxPages'] <= 30: raise ValueError('maxPages must be 1..30')
        url = BASE.rstrip('/') + '?' + urlencode({
            'filter[entity.legalAddress.country]': cohort['country'],
            'filter[entity.category]': 'GENERAL', 'filter[entity.status]': 'ACTIVE',
            'sort': 'lei', 'page[size]': page_size,
        })
        collected = []
        seen_pages=set()
        for page in range(cohort['maxPages']):
            if url in seen_pages: raise ValueError('Repeated pagination URL')
            seen_pages.add(url)
            response = fetch(url)
            collected.extend(response['data'])
            next_url = response.get('links', {}).get('next')
            if not next_url: break
            url = next_url
        verify_cohort_count(collected, response['meta']['pagination']['total'], cohort['maxPages'], page_size)
        if len({r['id'] for r in collected}) != len(collected): raise ValueError('Duplicate cohort rows across pages; retry coherent batch')
        for row in collected:
            records[row['id']] = row
            cohort_ids.add(row['id'])
        cohorts.append({**cohort, 'returned': len(collected),
                        'availableAtSource': response['meta']['pagination']['total'],
                        'truncated': bool(next_url), 'sort': 'lei',
                        'filters': 'ACTIVE, GENERAL, legal-address country'})
        print('Reference cohort', cohort['country'], len(collected), flush=True)
    if len(records) > 3000: raise ValueError('Scope exceeds 3000 entities')


    def parent_info(row):
        info = {}
        for kind in ['direct', 'ultimate']:
            links = row.get('relationships', {}).get(kind + '-parent', {}).get('links', {})
            if 'relationship-record' in links:
                response = fetch(links['relationship-record'])['data']
                # Endpoint has one relationship object. Never guess from name or address.
                info[kind] = {'kind': 'relationship', 'sourceUrl': links['relationship-record'], 'record': response}
            elif 'reporting-exception' in links:
                info[kind] = {'kind': 'exception', 'sourceUrl': links['reporting-exception'], 'record': fetch(links['reporting-exception'])['data']}
            else:
                info[kind] = {'kind': 'unavailable', 'sourceUrl': None, 'record': None}
        return row['id'], info

    parents = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for lei, info in pool.map(parent_info, list(records.values())):
            parents[lei] = info
            if len(parents) % 50 == 0: print('Parent evidence', len(parents), '/', len(records), flush=True)

    # Include one-hop external parents as context. Their ancestors are explicitly outside scope.
    missing = set()
    for info in parents.values():
        for value in info.values():
            if value['kind'] == 'relationship':
                missing.add(value['record']['attributes']['relationship']['endNode']['id'])
    missing -= records.keys()
    ensure_capacity(records, missing)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for row in pool.map(lambda lei: fetch(BASE + lei)['data'], sorted(missing)):
            records[row['id']] = row
            parents[row['id']] = {k: {'kind': 'not-fetched', 'sourceUrl': None, 'record': None} for k in ['direct', 'ultimate']}

    fetched = dt.datetime.now(dt.timezone.utc).isoformat()
    entities = []
    for lei, row in sorted(records.items()):
        a = row['attributes']; e = a['entity']; r = a['registration']
        entities.append({
            'retrievedAt': fetched, 'lei': lei, 'legalName': e['legalName']['name'],
            'otherNames': [n['name'] for n in e.get('otherNames', []) + e.get('transliteratedOtherNames', [])],
            'country': e['legalAddress']['country'], 'city': e['legalAddress']['city'],
            'jurisdiction': e.get('jurisdiction'), 'category': e.get('category'),
            'entityStatus': e['status'], 'registrationStatus': r['status'],
            'lastUpdate': r['lastUpdateDate'], 'nextRenewal': r.get('nextRenewalDate'),
            'createdAt': e.get('creationDate'), 'groups': sorted(groups.get(lei, [])),
            'sourceUrl': BASE + lei, 'parents': parents[lei],
            'contextOnly': lei not in groups and lei not in cohort_ids,
        })
    payload = {'schemaVersion': 1, 'fetchedAt': fetched, 'source': 'GLEIF', 'license': 'CC0-1.0',
               'scope': 'Configured group seeds plus two reported child generations, and bounded ACTIVE/GENERAL regional legal-address reference cohorts sorted by LEI. One-hop parents added as context. Not all companies in any region, a client list, or a complete group tree.',
               'cohorts': cohorts,
               'seeds': seeds, 'coverage': seed_coverage, 'entities': entities,
               'sourcePublishDates': sorted({r.get('meta', {}).get('goldenCopy', {}).get('publishDate') for r in raw.values()} - {None})}
    payload['contentHash'] = hashlib.sha256(json.dumps(entities, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    payload['collectionMetrics']={'networkRequests':NETWORK_REQUESTS,'retries':RETRY_COUNT,'resumedResponses':CACHE_HITS,'elapsedSeconds':round(time.monotonic()-START,2),'contextOnly':sum(e['contextOnly'] for e in entities),'uniqueEntities':len(entities),'stagingMaxAgeSeconds':3600}
    if supplement:
        payload = merge_supplement(json.loads((ROOT / 'gleif-snapshot.json').read_text()), payload)
        previous_raw = json.loads((ROOT / 'gleif-source-responses.json').read_text())
        previous_raw.update(raw)
        raw.clear()
        raw.update(previous_raw)
    ROOT.mkdir(exist_ok=True)
    for filename, value in [('gleif-source-responses.json', raw), ('gleif-snapshot.json', payload)]:
        temp = ROOT / (filename + '.tmp')
        temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        os.replace(temp, ROOT / filename)
    print(f'Saved {len(payload["entities"])} real entities; hash {payload["contentHash"]}', flush=True)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--supplement-seeds', help='Add/update these seeds without dropping the existing reference universe')
    parser.add_argument('--supplement-scope', help='Add regional cohorts without dropping the existing universe')
    args = parser.parse_args()
    main(args.supplement_seeds, args.supplement_scope)
