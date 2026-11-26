"""Business collection taxonomy, independent of standard flags. Not a legal baseline."""
import json,hashlib
from pathlib import Path
VERSION='2026-11-26-r9'
BASE_IDS='0001 0002 0021 0055 0067 0138 0143 0149 0156 0170 0244 0319 0355 0356 0381 0382 0407 0408 0409 0413 0414 0416 0417 0418 0433 0434 0439 0443 0450 0478 0546 0547 0548 0549 0560 0563 0594 0608 0613 0617 0620 0845 0851 0858 0868 0870 0997 0999 1000 1003 1008 1010 1099 1100 1103 1060 1062 1075 1087 1088 1129 1154'.split()
INTERNAL={'ESG-'+s for s in ['0020','0104','0107','0568','1070','1115','1117','0751']}
BASE={'ESG-'+s for s in BASE_IDS}
MODULES=['气候与资源专项','供应链专项','产品与研发专项','职业健康安全专项','员工细分专项','治理与经营专项','其他业务专项']
def classify(items):
 for i in items:
  key=i.get('legacyId',i['id']);n=i['name'];topic=i.get('topic') or ''
  if i.get('dimension')=='环境':module=MODULES[0]
  elif '供应链' in topic:module=MODULES[1]
  elif any(s in topic for s in ['产品','研发','创新','客户服务']):module=MODULES[2]
  elif '职业健康' in topic or '安全生产' in topic:module=MODULES[3]
  elif '员工' in topic:module=MODULES[4]
  elif i.get('dimension') in ['治理','经营绩效'] or '经营绩效' in topic:module=MODULES[5]
  else:module=MODULES[6]
  i['specialtyModule']=module;i['isBase']=key in BASE;i['internalReview']=key in INTERNAL or '待明确' in n
  i['collectionClass']='内部待核对项' if i['internalReview'] else ('基础项' if i['isBase'] else '行业专项项')
  i['baseReason']='业务通用收集清单；非特定交易所强制披露认定' if i['isBase'] else ''
  i['applicability']=i['collectionClass']
  if i['internalReview']:
   i['applicabilityNote']='原条目对象或范围不完整，移出正常生成和客户导出，保留内部维护。'
  elif i['isBase']:
   i['applicabilityNote']='通用收集项；无相关活动时可填写不适用及原因。'
  else:
   i['applicabilityNote']=module+'：选择相关业务主题或对标标准后纳入；无相关活动可取消勾选。'
  i['reviewStatus']='内部复核' if i['internalReview'] else '已按业务收集用途分类（非完整行业标准映射）'
 return items
if __name__=='__main__':
 root=Path(__file__).resolve().parents[1]
 for folder in ['data','local_data']:
  p=root/folder/'esg-indicators.json';x=classify(json.loads(p.read_text()));p.write_text(json.dumps(x,ensure_ascii=False,separators=(',',':')))
  (p.parent/'indicator-version.json').write_text(json.dumps({'version':VERSION,'count':len(x),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},ensure_ascii=False))
 pub=json.loads((root/'data/esg-indicators.json').read_text())
 summary={c:sum(i['collectionClass']==c for i in pub) for c in ['基础项','行业专项项','内部待核对项']}
 (root/'data/indicator-classification.json').write_text(json.dumps({'version':VERSION,'counts':summary,'basis':'业务收集分类，基础清单独立于标准标签；主题专项不代表完整行业适用标准','modules':MODULES,'internalItems':[{'id':i['id'],'legacyId':i['legacyId'],'name':i['name'],'reason':i['applicabilityNote']} for i in pub if i['internalReview']]},ensure_ascii=False,indent=2))
 print(summary)
