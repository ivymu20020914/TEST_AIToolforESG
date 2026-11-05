"""Apply explicit reviewed collection-item groups without losing source details."""
import copy
import json
from pathlib import Path


def merge_indicators(items):
    items = copy.deepcopy(items)
    index = {i['id']: i for i in items}
    removed = set()
    rules = json.loads(Path(__file__).with_name('indicator-merge-rules.json').read_text())
    for rule in rules:
        target = index.get(rule['target'])
        if target is None:
            continue
        members = [index[key] for key in rule['members'] if key in index]
        if not members:
            continue
        group = [target, *members]
        assert len({i['type'] for i in group}) == 1
        target['alwaysInclude'] = any(i.get('alwaysInclude') or not i['standards'] for i in group)
        target['standards'] = list(dict.fromkeys(s for i in group for s in i['standards']))
        details = [v for i in group for v in (i.get('mergeDetails') or [{'id': i['id'], 'name': i['name']}])]
        target['mergeDetails'] = list({v['id']: v for v in details}.values())
        target['mergeKind'] = rule['kind']
        requirements = [target.get('collectionRequirements')] + [v for i in members for v in [i['name'], i.get('collectionRequirements')]]
        if target['type'] == '定性':
            target['collectionRequirements'] = '；'.join(dict.fromkeys(v for v in requirements if v))
        for field in ['dimension', 'topic', 'category', 'originalTopic']:
            target[field] = ' | '.join(dict.fromkeys(v.strip() for i in group for v in (i.get(field) or '').split('|') if v.strip())) or None
        target['definition'] = '\n\n'.join(dict.fromkeys(f"【{i['name']}】\n{i['definition']}" for i in group if i.get('definition'))) or None
        for field in ['variants', 'standardSources']:
            values = [v for i in group for v in i.get(field, [])]
            target[field] = list({json.dumps(v, ensure_ascii=False, sort_keys=True): v for v in values}.values())
        if rule.get('options'):
            target['variants'] = rule['options'] + target.get('variants', [])
            target['definition'] = rule['options'][0]['definition']
            target['note'] = '可选口径：环保投入总额、环保设施运营成本（含折旧）'
        target['note'] = '\n'.join(dict.fromkeys(i['note'] for i in group if i.get('note')))
        if rule.get('options'):
            target['note'] += '\n可选口径：环保投入总额、环保设施运营成本（含折旧）'
        if rule.get('name'):
            target['name'] = rule['name']
        removed.update(i['id'] for i in members)
    for key, name in {'ESG-0152': '环境应急演练参与人数／人次', 'ESG-0154': '环保培训参与人数／人次'}.items():
        if key in index:
            index[key]['name'] = name
    return [i for i in items if i['id'] not in removed]


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    for folder in ['local_data', 'data']:
        path = root / folder / 'esg-indicators.json'
        original = json.loads(path.read_text())
        merged = merge_indicators(original)
        path.write_text(json.dumps(merged, ensure_ascii=False, separators=(',', ':')))
        print(folder, len(original), '->', len(merged))
    audit = [{'target': i['id'], 'name': i['name'], 'kind': i['mergeKind'], 'members': i['mergeDetails']} for i in merged if i.get('mergeDetails')]
    (root / 'data' / 'indicator-merge-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2))
