"""Versioned structural enrichment; similarity produces candidates, never automatic merges."""
import json,re,difflib,hashlib
from pathlib import Path
VERSION='2026-11-26-r6'
BASE={'ESG-0355','ESG-0381','ESG-0382'}

def enrich(items):
 for i in items:
  i['name'] = {'ESG-0752':'基层员工人均职业发展培训时长','ESG-0756':'基层员工定期绩效与职业发展考核覆盖率'}.get(i['id'],i['name'])
  n=i['name']; raw=i.get('category') or '';topic=(i.get('topic') or '待分类').split('|')[0].strip()
  topic = '应对气候变化' if i.get('dimension') == '环境' and re.search('温室气体|范围[一二三123]|碳排放', n) else topic
  group=raw.split('|')[0].strip() or topic+'综合指标'
  if '员工' in topic:
   if re.search('培训|考评|考核',n+raw):group='员工培训与发展'
   elif re.search('新进|招聘',n+raw):group='员工招聘'
   elif re.search('流失|离职',n+raw):group='员工流失'
   elif re.search('学历|博士|硕士|本科|大专',n+raw):group='员工构成—学历'
   elif re.search('岁|年龄',n+raw):group='员工构成—年龄'
   elif re.search('男性|女性|性别',n+raw):group='员工构成—性别'
   elif re.search('管理层|基层|职级',n+raw):group='员工构成—职级'
   else:group='员工基本情况'
  if len(n)<=12 and re.search(r'^(博士|硕士|本科|大专|基层|管理层|\d+.*岁)',n):
   i.setdefault('originalName',n)
   if '人数' in raw and '人数' not in n:n=group+'—'+n+'人数'
   elif '占比' in raw and not any(x in raw for x in ['流失','新进']):n=group+'—'+n+'占比'
   else:n=group+'—'+n
   i['name']=n
  i['level1']=i.get('dimension') or '待分类';i['level2']=topic;i['level3']=group;i['level4']=n
  i['hierarchyPath']=' / '.join([i['level1'],topic,group,n]);i['parentId']='group:'+hashlib.sha256((i['level1']+'|'+topic+'|'+group).encode()).hexdigest()[:12]
  i['isBase']=i['id'] in BASE;i['baseReason']='业务整理基础候选，非港交所条款认定' if i['isBase'] else ''
  product=any(t in n for t in ['产品检测','产品召回','制成品','生产设备'])
  i['applicability']='业务条件适用' if product else ('基础候选' if i['isBase'] else '待项目经理确认')
  i['excludedIndustries']=['金融','服务'] if product else []
  i['applicabilityNote']='涉及实体产品或生产业务时适用；金融、服务行业默认排除，特殊业务可人工确认' if product else '按业务范围确认；标准映射不等于强制适用'
  i['reviewStatus']='待核对' if ('待明确' in n or len((i.get('originalName') or n))<5) else '结构已整理，业务适用性待审核'
  i['ageBoundaryNote']='年龄分组须确认上下限是否包含；“以下”不含边界，“及以下”包含边界；不得跨统计对象自动合并' if re.search('岁|周岁',n) else ''
  i['guidance']='请说明本年度制度与责任分工、主要工作、执行成效、亮点案例、支持材料及后续计划；不适用内容可说明原因。此为填报辅助说明，非标准原文。' if '定性' in i['type'] else ''
  order={'员工基本情况':0,'员工构成—性别':1,'员工构成—年龄':2,'员工构成—学历':3,'员工构成—职级':4,'员工招聘':5,'员工流失':6,'员工培训与发展':7}
  i['sortKey']=[{'环境':0,'社会':1,'治理':2}.get(i['level1'],3),topic,order.get(group,10),group,int(re.sub(r'\D','',i['id']))]
 return sorted(items,key=lambda i:i['sortKey'])

if __name__=='__main__':
 root=Path(__file__).resolve().parents[1]
 paths=[root/'data/esg-indicators.json']
 if (root/'local_data/esg-indicators.json').exists():paths.append(root/'local_data/esg-indicators.json')
 for p in paths:
  items=enrich(json.loads(p.read_text()));p.write_text(json.dumps(items,ensure_ascii=False,separators=(',',':')))
  (p.parent/'indicator-version.json').write_text(json.dumps({'version':VERSION,'count':len(items),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},ensure_ascii=False))
 candidates=[]
 for a,i in enumerate(items):
  for j in items[a+1:]:
   if i['type']!=j['type']:continue
   normalize=lambda n:re.sub(r'周岁','岁',re.sub(r'[\s（）()]','',n))
   score=difflib.SequenceMatcher(None,normalize(i['name']),normalize(j['name'])).ratio()
   if score>=.82:candidates.append({'a':i['id'],'nameA':i['name'],'b':j['id'],'nameB':j['name'],'similarity':round(score,3),'decision':'仅候选，须比较对象、范围、边界和计量方式；未自动合并'})
 (root/'data/indicator-review-queue.json').write_text(json.dumps({'version':VERSION,'pendingSources':['GEM C2剩余条款覆盖与报告年度适用性复核','金融行业电子规范底稿','HIESG资料授权与版本'],'candidates':candidates},ensure_ascii=False,indent=2))
 print(len(items),len(candidates))
