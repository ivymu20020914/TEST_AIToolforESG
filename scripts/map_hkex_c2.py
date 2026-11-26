"""Partial explicit mappings to the user-supplied GEM C2 PDF; not full compliance."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MAPPING={
 'ESG-0001':('D.28(a)、29',17,'强制披露','范围一排放量及其计量方法、输入资料、假设和变更。'),
 'ESG-0002':('D.28(b)、29(c)',17,'强制披露','以地域为基准的范围二排放及相关合约文书信息。'),
 'ESG-0004':('D.28(c)、29(d)',17,'自愿披露（GEM第16段）','范围三排放量及纳入核算的类别。'),
 'ESG-0068':('A1.3',5,'不遵守就解释','有害废弃物产生总量（吨）及适用时的密度。'),
 'ESG-0069':('A1.4',5,'不遵守就解释','无害废弃物产生总量（吨）及适用时的密度。'),
 'ESG-0055':('A2.2',6,'不遵守就解释','总耗水量及密度。'),
 'ESG-0172':('A2.1',6,'不遵守就解释','按类型划分的直接能源总耗量及密度。'),
 'ESG-0173':('A2.1',6,'不遵守就解释','按类型划分的间接能源总耗量及密度。'),
 'ESG-0355':('B1.1',7,'不遵守就解释','按性别、雇佣类型、年龄组别及地区划分的员工总数。'),
 'ESG-0381':('B1.1',7,'不遵守就解释','按性别划分的员工人数（男性分项）。'),
 'ESG-0382':('B1.1',7,'不遵守就解释','按性别划分的员工人数（女性分项）。'),
 'ESG-0904':('B2.1',7,'不遵守就解释','过去三年（包括报告年度）每年因工死亡人数及比率。'),
 'ESG-0906':('B2.2',7,'不遵守就解释','因工伤损失工作日数。'),
 'ESG-0549':('B4.1、B4.2',8,'不遵守就解释','防止童工、强制劳动的招聘审查措施及发现违规后的消除步骤。'),
 'ESG-0434':('B6.2',9,'不遵守就解释','接获产品及服务投诉的数量及应对方法。'),
 'ESG-0775':('B6.3',9,'不遵守就解释','维护及保障知识产权的管理实践。'),
 'ESG-0432':('B6.4',9,'不遵守就解释','质量检定过程及产品回收程序。'),
 'ESG-1085':('B7.1',9,'不遵守就解释','报告期内对公司或员工提出并已审结的贪污诉讼案件数及结果。'),
 'ESG-1062':('B7.3',9,'不遵守就解释','向董事及员工提供的反贪污培训。'),
 'ESG-0851':('B8.2',10,'不遵守就解释','在社区投资重点贡献领域投入的资金或时间。'),
 'ESG-1000':('B.13(i)',4,'强制披露','董事会对环境、社会及管治事项的监督。')}

def apply(items):
 for i in items:
  if i['id'] not in MAPPING:continue
  ref,page,obligation,definition=MAPPING[i['id']]
  i['standards']=list(dict.fromkeys(i['standards']+['hkex_gem_c2']))
  i['hkexReference']=ref;i['hkexObligation']=obligation
  source={'standard':'hkex_gem_c2','name':'港交所GEM附录C2','version':'用户提供PDF，文件版本号VER38252（未据此确认当前有效版本）','reference':f'GEM附录C2 {ref}；PDF第{page}页','condition':obligation+'；仅对应用户提供GEM文件，按上市板块、报告年度及业务范围确认','status':'条款对应初核，非完整覆盖；单一指标可能仅覆盖条款部分要求','originalLabel':definition}
  i['standardSources']=[s for s in i.get('standardSources',[]) if s.get('standard')!='hkex_gem_c2']+[source]
  variant={'label':'港交所GEM C2','unit':i['unit'],'definition':definition+' 此条目可能只覆盖条款部分要求，须结合完整条款补充。','standard':'hkex_gem_c2','reference':source['reference'],'note':source['condition']}
  i['variants']=[v for v in i.get('variants',[]) if v.get('standard')!='hkex_gem_c2']+[variant]
 return items
if __name__=='__main__':
 for folder in ['data','local_data']:
  p=ROOT/folder/'esg-indicators.json'
  if not p.exists():continue
  items=apply(json.loads(p.read_text()));p.write_text(json.dumps(items,ensure_ascii=False,separators=(',',':')))
  (p.parent/'indicator-version.json').write_text(json.dumps({'version':'2026-11-26-r6','count':len(items),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},ensure_ascii=False))
 (ROOT/'data/hkex-c2-coverage.json').write_text(json.dumps({'source':'HKEXCN_SC_8299_VER38252.pdf','market':'GEM','scope':'21个已有指标的条款对应初核，未覆盖全部C2要求','important':['A1.2已删除，不作为现行碳排放条款','D16自愿披露；D17要求范围一、二及相关计量披露','文件当前有效版本与适用年度尚未独立核实'],'mappedIds':list(MAPPING),'pending':'其余C部分、B14/15及D部分详细覆盖仍待逐项补齐'},ensure_ascii=False,indent=2))
