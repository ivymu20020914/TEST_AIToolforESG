"""Convert the reviewed indicator dictionary to the local web data file."""

import argparse
import json
import re
from pathlib import Path

from openpyxl import load_workbook
from merge_indicators import merge_indicators


STANDARD_FIELDS = ('msci_esg', 'wind_esg', 'syntaogf_esg', 'ecovadis', 'a_share_pending',
                   'gri', 'ifrs_s1', 'ifrs_s2', 'vsme')


TOPIC_ALIASES = {
    '研发与创新': '研发创新',
    '人力资源管理': '员工雇佣与发展',
    '员工权益保障': '员工雇佣与发展',
    '员工培训与发展': '员工雇佣与发展',
    '人才培养与发展': '员工雇佣与发展',
    '行业发展': '行业合作与发展',
    '公益慈善': '社会公益与社区关系',
    '社会公益': '社会公益与社区关系',
    '社区关系与社会贡献': '社会公益与社区关系',
    '反腐败与商业道德': '商业道德',
    'ESG管理': '公司治理',
    '可持续发展治理': '公司治理',
    '环境合规管理': '环境管理',
    '优质产品与服务': '产品质量与安全',
    '信息安全': '数据安全与隐私保护',
    '数据安全与隐私': '数据安全与隐私保护',
    '污废管理': '污染与废弃物管理',
    '污染物与废弃物管理': '污染与废弃物管理',
    '风险管理': '合规与风险管理',
    '财务绩效': '经营绩效',
}


def normalize_topics(value):
    topics = []
    for original in (value or '').split('|'):
        topic = re.sub(r'[（(].*?[）)]', '', original, flags=re.DOTALL)
        topic = re.sub(r'\s+', '', topic)
        topic = TOPIC_ALIASES.get(topic, topic)
        if topic and topic not in topics:
            topics.append(topic)
    return ' | '.join(topics)


def records(sheet):
    rows = iter(sheet.values)
    headers = next(rows)
    return (dict(zip(headers, row)) for row in rows)


def import_dictionary(source):
    workbook = load_workbook(source, read_only=True, data_only=True)
    try:
        indicators = {}
        for tab in ('定量指标', '定性指标'):
            for row in records(workbook[tab]):
                identifier = row['指标编号']
                indicators[identifier] = {
                    'id': identifier,
                    'name': row['指标名称'],
                    'dimension': row['维度'],
                    'topic': normalize_topics(row['议题']),
                    'originalTopic': row['议题'],
                    'category': row['上级指标'],
                    'type': row['数据类型'],
                    'unit': row['单位'],
                    'definition': row['定义与统计口径'],
                    'industry': row['industry_codes'],
                    'note': row['口径核对'],
                    'standards': [key for key in STANDARD_FIELDS if row.get(key) == 1],
                }
        for row in records(workbook['口径明细']):
            item = indicators[row['合并后指标编号']]
            if not (row['单位'] or row['定义与统计口径']):
                continue
            variant = {
                'label': row['指标名称'],
                'unit': row['单位'],
                'definition': row['定义与统计口径'],
                'note': row['口径核对'],
            }
            variants = item.setdefault('variants', [])
            if variant not in variants:
                variants.append(variant)
        if '标准映射' in workbook.sheetnames:
            for row in records(workbook['标准映射']):
                item = indicators[row['指标编号']]
                source = {
                    'standard': row['标准字段'],
                    'name': row['标准名称'],
                    'version': row['分类标准版本'],
                    'concept': row['电子化元素代码'],
                    'reference': row['标准条款及来源链接'],
                    'condition': row['适用性提示'],
                    'status': row['核对状态'],
                    'originalLabel': row['标准原文标签'],
                    'originalDefinition': row.get('官方原文说明'),
                    'measurement': row.get('官方计量提示'),
                    'translationNote': row.get('中文表述属性'),
                }
                item.setdefault('standardSources', []).append(source)
                if row['口径说明（中文整理）']:
                    variant = {
                        'label': row['标准名称'],
                        'unit': row['单位'],
                        'definition': row['口径说明（中文整理）'],
                        'standard': row['标准字段'],
                        'reference': row['标准条款及来源链接'],
                        'note': row['适用性提示'],
                    }
                    variants = item.setdefault('variants', [])
                    signature = (variant['unit'], variant['definition'], variant['standard'])
                    if not any((v['unit'], v['definition'], v.get('standard')) == signature for v in variants):
                        variants.append(variant)
        for item in indicators.values():
            variants = item.get('variants', [])
            if item['id'] in ('ESG-0152', 'ESG-0154'):
                by_unit = {}
                for variant in sorted(variants, key=lambda option: not option['definition']):
                    by_unit.setdefault(variant['unit'], variant)
                item['variants'] = list(by_unit.values())
        return list(indicators.values())
    finally:
        workbook.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--publish-snapshot', action='store_true', help='同时生成公开试用版通用指标快照')
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'local_data' / 'esg-indicators.json'
    indicators = merge_indicators(import_dictionary(args.workbook))
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(indicators, ensure_ascii=False), encoding='utf-8')
    temporary.replace(target)
    if args.publish_snapshot:
        public_items = []
        for item in indicators:
            standard_variants = [
                {
                    'label': variant['label'],
                    'unit': variant['unit'],
                    'definition': variant['definition'],
                    'standard': variant.get('standard'),
                    'reference': variant.get('reference'),
                    'note': variant.get('note') if variant.get('publicScope') else '按对应标准条款核对适用范围',
                    'publicScope': variant.get('publicScope', False),
                }
                for variant in item.get('variants', []) if variant.get('standard') or variant.get('publicScope')
            ]
            sources = [
                {key: source.get(key) for key in (
                    'standard', 'name', 'version', 'concept', 'reference',
                    'originalLabel', 'originalDefinition', 'measurement', 'translationNote'
                )}
                for source in item.get('standardSources', [])
            ]
            for source in sources:
                source['condition'] = '按对应标准条款核对适用范围'
                source['status'] = '首批标准映射'
            primary = standard_variants[0] if standard_variants else {}
            public_items.append({
                'id': item['id'],
                'name': item['name'],
                'dimension': item['dimension'],
                'topic': item['topic'],
                'category': None,
                'type': item['type'],
                'unit': primary.get('unit', item['unit']),
                'definition': primary.get('definition'),
                'industry': None,
                'note': '通用框架试用，统计口径可由项目经理补充调整',
                'standards': item['standards'],
                'alwaysInclude': item.get('alwaysInclude', False),
                'mergeDetails': item.get('mergeDetails', []),
                'mergeKind': item.get('mergeKind'),
                'collectionRequirements': item.get('collectionRequirements'),
                'variants': standard_variants,
                'standardSources': sources,
            })
        public_target = target.parent.parent / 'data' / 'esg-indicators.json'
        public_target.parent.mkdir(parents=True, exist_ok=True)
        public_target.write_text(json.dumps(public_items, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'已导入 {len(indicators)} 条指标')


if __name__ == '__main__':
    main()
