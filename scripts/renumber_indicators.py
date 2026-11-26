"""Contiguous presentation IDs; immutable source IDs remain separately traceable."""
import copy,json,hashlib
from pathlib import Path
VERSION='2026-11-26-r8'
def renumber(items):
    result=copy.deepcopy(items)
    for n,i in enumerate(result,1):
        i['legacyId']=i.get('legacyId',i['id'])
        i['stableKey']='source:'+i['legacyId']
        i['id']=f'{n:03d}'
    return result
if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    for folder in ['data','local_data']:
        p=root/folder/'esg-indicators.json';items=renumber(json.loads(p.read_text()));p.write_text(json.dumps(items,ensure_ascii=False,separators=(',',':')))
        (p.parent/'indicator-version.json').write_text(json.dumps({'version':VERSION,'count':len(items),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},ensure_ascii=False))
    items=json.loads((root/'data/esg-indicators.json').read_text())
    lookup={alias:i['id'] for i in items for alias in [i['legacyId']]+[s['id'] for s in i.get('mergeDetails',[])]}
    mapping=[{'id':i['id'],'legacyId':i['legacyId'],'name':i['name'],'aliases':[s['id'] for s in i.get('mergeDetails',[])]} for i in items]
    (root/'data/indicator-id-map.json').write_text(json.dumps({'version':VERSION,'mapping':mapping},ensure_ascii=False,indent=2))
    for name in ['indicator-review-queue.json','indicator-merge-audit.json','hkex-c2-coverage.json']:
        p=root/'data'/name;data=json.loads(p.read_text())
        if name=='indicator-review-queue.json':
            data['version']=VERSION
            for c in data['candidates']:
                for field in ['a','b']:
                    source=c.get(field+'Legacy',c[field]);c[field+'Legacy']=source;c[field]=lookup.get(source,source)
        elif name=='indicator-merge-audit.json':
            for c in data:
                source=c.get('legacyTarget',c['target']);c['legacyTarget']=source;c['target']=lookup.get(source,source)
        else:
            data.setdefault('legacyMappedIds',data['mappedIds']);data['mappedIds']=list(dict.fromkeys(lookup.get(k,k) for k in data['legacyMappedIds']))
        p.write_text(json.dumps(data,ensure_ascii=False,indent=2))
