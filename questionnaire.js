const questionnaireState = { quantitative: [], qualitative: [], title: '项目资料收集问卷', importedIndicators: [] };

const questionnaireSamples = `项目名称：青岚科技2026年度ESG报告
请提供2026年度温室气体排放总量（吨二氧化碳当量），需提供核算边界和统计口径。
请填写截至2026年12月31日的员工总数（人），必填。
请提供报告期内安全生产培训覆盖率（%）。
请说明公司如何识别和管理供应链ESG风险。
请描述本年度在员工多元化与平等方面采取的主要措施及成效。
请说明董事会如何监督可持续发展相关议题。`;

function renderQuestionnaireWorkspace() {
  document.querySelector('#pageCrumb').textContent = '问卷生成';
  app.innerHTML = `<section class="page questionnaire-page">
    <button class="back-link" type="button" data-route="home">← 返回工具中心</button>
    <div class="workspace-hero"><div class="workspace-title"><span class="tool-icon">问</span><div><h1>指标问卷生成</h1><span class="workspace-title-en">INDICATOR QUESTIONNAIRE BUILDER</span><p>用同一套指标数据库生成指标表、定量收集表和全量指标问卷。</p></div></div><span class="prototype-tag ready-tag">可试用 · 本机处理</span></div>
    <div class="questionnaire-boundary"><strong>数据底座</strong> 指标编号是往返编辑的主键。定量指标同时进入数据收集表和问卷，定性指标按内容生成问法。所有处理均在浏览器本机完成；当前为规则生成，不调用模型。</div>
    <section class="work-panel questionnaire-source">
      <div class="questionnaire-step"><span>01</span><div><h2>选择指标来源</h2><p>可从指标库直接衔接，也可将导出的指标表在本地修改后重新导入。</p></div></div>
      <div class="questionnaire-paths">
        <button class="questionnaire-path" type="button" id="openIndicatorBuilder"><strong>从指标库直接生成</strong><span>前往指标表生成，选择指标后点击“生成问卷”</span></button>
        <label class="questionnaire-path"><strong>导入修改后的指标表</strong><span>支持本站导出的 XLSX 或 CSV，按指标编号匹配数据库</span><input id="questionnaireFile" type="file" accept=".xlsx,.csv,.txt,.md,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/json"></label>
      </div>
      <label class="field"><span>问卷名称</span><input id="questionnaireTitle" value="项目资料收集问卷" maxlength="80"></label>
      <details class="questionnaire-paste"><summary>也可以粘贴未结构化文字</summary><label class="field"><span>已有项目信息</span><textarea id="questionnaireSource" rows="8" placeholder="建议每个要求单独一行">${questionnaireSamples}</textarea></label></details>
      <div class="questionnaire-source-actions"><button class="run-btn" id="generateQuestionnaire" type="button">识别粘贴内容并生成</button></div>
      <div id="questionnaireFileNote" class="hint">资料仅在当前浏览器页面中处理；请勿在公开演示站处理机密或个人敏感信息。</div>
    </section>
    <section id="questionnaireResults" class="questionnaire-results" hidden></section>
  </section>`;
  document.querySelector('#generateQuestionnaire').addEventListener('click', generateQuestionnaire);
  document.querySelector('#questionnaireFile').addEventListener('change', readQuestionnaireFile);
  document.querySelector('#openIndicatorBuilder').addEventListener('click', () => { location.hash = '#/indicators'; });
  const pending = sessionStorage.getItem('questionnaireIndicators');
  if (pending) {
    sessionStorage.removeItem('questionnaireIndicators');
    try { generateQuestionnaireFromIndicators(JSON.parse(pending), '已从指标库接收所选指标'); } catch { showToast('读取所选指标失败'); }
  }
}

async function readQuestionnaireFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const note = document.querySelector('#questionnaireFileNote');
  if (file.size > 12 * 1024 * 1024) { note.textContent = '文件超过 12 MB，请精简后再试。'; return; }
  try {
    let rows;
    if (/\.xlsx$/i.test(file.name)) {
      const workbook = await readLocalWorkbook(file);
      rows = (workbook.sheets || [workbook]).map(sheet => sheet.rows).find(candidate => rowsToQuestionnaireIndicators(candidate).length) || workbook.rows;
    }
    else if (/\.csv$/i.test(file.name)) rows = parseQuestionnaireCsv(await file.text());
    else {
      document.querySelector('#questionnaireSource').value = await file.text();
      note.textContent = `已在本机读取 ${file.name}，请点击“识别粘贴内容并生成”。`;
      return;
    }
    const indicators = rowsToQuestionnaireIndicators(rows);
    if (!indicators.length) throw new Error('未找到“指标名称”列或有效数据行');
    generateQuestionnaireFromIndicators(indicators, `已从 ${file.name} 读取 ${indicators.length} 条指标`);
  } catch (error) { note.textContent = `无法导入：${error.message || '请使用本站导出的 XLSX 或 CSV'}`; }
}

function generateQuestionnaire() {
  const source = document.querySelector('#questionnaireSource').value.trim();
  if (!source) { showToast('请先粘贴项目信息'); return; }
  questionnaireState.title = document.querySelector('#questionnaireTitle').value.trim() || '项目资料收集问卷';
  const items = splitQuestionnaireSource(source);
  questionnaireState.quantitative = [];
  questionnaireState.qualitative = [];
  items.forEach((text, index) => {
    if (isQuantitativeItem(text)) questionnaireState.quantitative.push(toQuantitative(text, index));
    questionnaireState.qualitative.push(toQualitative(text, index, isQuantitativeItem(text) ? '定量' : '定性'));
  });
  renderQuestionnaireResults();
}

function parseQuestionnaireCsv(text) {
  const rows = [[]]; let value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { rows.at(-1).push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; rows.at(-1).push(value); value = ''; rows.push([]); }
    else value += char;
  }
  rows.at(-1).push(value);
  return rows.filter(row => row.some(cell => cell.trim())).map((row, r) => row.map((cell, c) => r === 0 && c === 0 ? cell.replace(/^\uFEFF/, '') : cell));
}

function rowsToQuestionnaireIndicators(rows) {
  if (rows.length < 2) return [];
  const aliases = { id: ['指标编号','编号','ID'], type: ['数据类型','类型'], dimension: ['维度','一级维度'], topic: ['议题','大议题','二级议题'], category: ['三级指标组','上级指标'], name: ['指标名称','名称','指标','原始指标','字段'], unit: ['单位'], definition: ['定义与统计口径','统计口径','定义'], matched: ['本次纳入依据'], note: ['口径核对','备注'], standardReference: ['标准条款及适用条件'], scopeSource: ['所选口径来源'] };
  const header = rows[0].map(cell => String(cell).trim());
  const indexes = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, header.findIndex(value => names.includes(value))]));
  if (indexes.name < 0) return [];
  return rows.slice(1).map((row, index) => Object.fromEntries(Object.entries(indexes).map(([key, column]) => [key, column >= 0 ? String(row[column] ?? '').trim() : ''])))
    .filter(item => item.name).map((item, index) => ({ ...item, id: item.id || `IMP-${String(index + 1).padStart(4, '0')}`, type: item.type || '定性' }));
}

function generateQuestionnaireFromIndicators(indicators, message) {
  questionnaireState.title = document.querySelector('#questionnaireTitle')?.value.trim() || '项目资料收集问卷';
  questionnaireState.importedIndicators = indicators;
  questionnaireState.quantitative = indicators.filter(item => item.type.includes('定量')).map((item, index) => toQuantitativeIndicator(item, index));
  questionnaireState.qualitative = indicators.map((item, index) => toIndicatorQuestion(item, index));
  const note = document.querySelector('#questionnaireFileNote');
  if (note) note.textContent = `${message}。其中 ${questionnaireState.quantitative.length} 条进入定量收集表，全部 ${indicators.length} 条均已生成问卷题目。`;
  renderQuestionnaireResults();
}

function splitQuestionnaireSource(source) {
  return source.split(/\r?\n|(?<=[。；;！？!?])\s+/).map(value => value.trim().replace(/^[-•·\d.、）)\s]+/, ''))
    .filter(value => value.length > 3 && !/^项目名称[:：]/.test(value)).slice(0, 80);
}

function isQuantitativeItem(text) {
  return /数量|总数|比例|率|金额|收入|支出|投入|排放|能耗|用水|废弃物|事故|人次|小时|天数|面积|吨|千瓦|万元|亿元|人民币元|%|％|数据|数值|截至|报告期内/.test(text);
}

function inferUnit(text) {
  const match = text.match(/[（(]([^（）()]{1,16})[）)]|(%|％|吨二氧化碳当量|千瓦时|兆瓦时|平方米|人次|万元|亿元|人民币元|吨|小时|天)/);
  return match ? (match[1] || match[2]).replace('％', '%') : '';
}

function inferPeriod(text) {
  const year = text.match(/20\d{2}年度?|截至20\d{2}年\d{1,2}月\d{1,2}日/);
  return year ? year[0] : (/报告期|本年度/.test(text) ? '报告期' : '待确认');
}

function cleanItemName(text) {
  return text.replace(/^(请提供|请填写|请说明|请描述|提供|填写)/, '').replace(/[。；;]$/, '').replace(/（[^）]+）|\([^)]*\)/g, '').trim();
}

function toQuantitative(text, index) {
  const unit = inferUnit(text);
  return { id: `D${index + 1}`, included: true, field: cleanItemName(text), type: /率|比例|%|％/.test(text) ? '百分比' : /日期|截至/.test(text) ? '数值' : '数值', unit, calibre: /需提供([^。；]+)/.test(text) ? text.match(/需提供([^。；]+)/)[1] : '请按项目统一口径填写', period: inferPeriod(text), required: /必填|需提供|请提供|请填写/.test(text) ? '是' : '否', source: text };
}

function toQuantitativeIndicator(item, index) {
  return { id: item.id || `D${index + 1}`, included: true, field: item.name, type: /%|率|比例/.test(`${item.name}${item.unit}`) ? '百分比' : '数值', unit: item.unit || '', calibre: item.definition || '请按项目统一口径填写', period: '报告期', required: '是', source: item.name };
}

function toQualitative(text, index, type = '定性') {
  const topic = cleanItemName(text);
  return { id: `Q${index + 1}`, included: true, topic, type, unit: inferUnit(text), variants: makeQuestionVariants(topic, 0, { type, unit: inferUnit(text) }), selected: 0 };
}

function toIndicatorQuestion(item, index) {
  const profile = { type: item.type || '定性', unit: item.unit || '', definition: item.definition || '', id: item.id || `Q${index + 1}` };
  return { id: profile.id, included: true, topic: item.name, type: profile.type, unit: profile.unit, definition: profile.definition, variants: makeQuestionVariants(item.name, 0, profile), selected: 0 };
}

function makeQuestionVariants(topic, refresh, profile = {}) {
  const seed = refresh % 3;
  const clean = topic.replace(/[？?。]$/, ''), unit = profile.unit ? `（单位：${profile.unit}）` : '';
  let base;
  if ((profile.type || '').includes('定量')) base = [`请填报报告期内的${clean}${unit}，并说明核算边界、计算方法、同比变化、数据来源及佐证材料。`, `想请您介绍一下：贵公司报告期内的${clean}${unit}是多少？也请一并说明核算边界、计算方法、同比变化、数据来源，并提供相关佐证材料。`, `请提供报告期内${clean}${unit}的数据，以及核算边界、计算方法、同比变化、数据来源和佐证材料。`];
  else if (/方针|政策|制度|机制/.test(clean)) { const subject = clean.replace(/的建立及传达$|的制定$|的建立$/, ''); base = [`公司是否制定并传达${subject}？如是，请说明制定依据、治理责任、适用范围、核心内容、审批层级、执行流程、培训传达、监督检查及更新机制，并提供相关文件。`, `想请您介绍一下公司在${subject}方面的安排：其制定依据和治理责任是什么，适用于哪些范围，经过何种审批，又如何执行、培训传达、监督检查和更新？如方便，也请提供相关文件。`, `请系统说明${subject}的制定依据、治理责任、适用范围、核心内容、审批层级、执行流程、培训传达、监督检查及更新机制，并提供相关文件。`]; }
  else if (/目标|计划|规划|路线图/.test(clean)) { const subject = clean.replace(/的制定$|的设定$|的编制$/, ''); base = [`公司是否制定${subject}？请说明基准、阶段性和长期目标、适用范围、责任部门、资源投入、进展监测、偏差纠正及完成情况。`, `想请您分享一下公司围绕${subject}作出的安排：基准、阶段性和长期目标分别是什么，覆盖哪些范围，由哪个部门负责，投入了哪些资源，又如何监测进展、纠正偏差并评估完成情况？`, `请说明${subject}的基准、阶段性和长期目标、适用范围、责任部门、资源投入、进展监测、偏差纠正及完成情况。`]; }
  else if (/核查|监测|报告|盘查|审计|鉴证/.test(clean)) base = [`公司是否开展${clean}？请说明组织边界、方法标准、实施频次、责任部门、数据控制、内部复核、第三方鉴证、报告机制、主要结果及改进措施。`, `想请您介绍一下公司如何开展${clean}：覆盖哪些组织边界，依据什么方法标准，以什么频次开展，由谁负责，如何进行数据控制、内部复核和第三方鉴证，结果如何报告并用于改进？`, `请说明${clean}的组织边界、方法标准、实施频次、责任部门、数据控制、内部复核、第三方鉴证、报告机制、主要结果及改进措施。`];
  else if (/评估|评价|识别|分析|调查/.test(clean)) { const subject = clean.replace(/的评估及改进$|的评估与改进$|的评估$/, ''); base = [`公司是否开展${subject}评估，并根据结果实施改进？请说明对象和边界、评价标准、数据来源、实施频次、责任分工、关键结论及改进闭环。`, `想请您介绍一下公司如何评估${subject}：评估对象和边界是什么，采用哪些标准和数据，以什么频次开展，由谁负责，得出了哪些关键结论，又如何推动后续改进闭环？`, `请说明${subject}评估的对象和边界、评价标准、数据来源、实施频次、责任分工、关键结论及改进闭环。`]; }
  else if (/改进|提升|优化|整改|减排|降低/.test(clean)) base = [`请说明${clean}的目标、行动方案、责任部门、资源投入、进度监测、量化成效及后续计划。`, `想请您分享一下公司为推进${clean}设定了哪些目标和行动方案，由谁负责，投入了哪些资源，如何监测进度，目前取得了哪些量化成效，下一步又有哪些计划？`, `请说明${clean}的目标、行动方案、责任部门、资源投入、进度监测、量化成效及后续计划。`];
  else if (/管理|治理|监督|控制/.test(clean)) base = [`请说明${clean}的治理架构、制度流程、责任部门、目标指标、监督检查、绩效评估及持续改进。`, `想请您介绍一下公司如何组织和推进${clean}：治理架构和制度流程如何设置，由哪些部门负责，设定了哪些目标指标，又如何开展监督检查、绩效评估和持续改进？`, `请系统说明${clean}的治理架构、制度流程、责任部门、目标指标、监督检查、绩效评估及持续改进。`];
  else base = [`请说明${clean}的管理要求、适用范围、责任分工、实施过程、绩效结果、存在问题及改进计划。`, `想请您介绍一下公司目前如何开展${clean}：有哪些管理要求，适用于哪些范围，由谁负责，具体如何实施，取得了哪些结果，还存在哪些问题和改进计划？`, `请系统说明${clean}的管理要求、适用范围、责任分工、实施过程、绩效结果、存在问题及改进计划。`];
  const groups = [base, [base[0].replace('请说明', '请概述'), base[1].replace('能否', '请问是否方便'), base[2].replace('请系统说明', '请详细说明')], [base[0].replace('请说明', '请介绍'), base[1].replace('能否介绍', '请分享'), base[2].replace('请系统说明', '请结合实际案例说明')]];
  return groups[seed];
}

function renderQuestionnaireResults() {
  const root = document.querySelector('#questionnaireResults');
  root.hidden = false;
  root.innerHTML = `<div class="questionnaire-result-head"><div class="questionnaire-step"><span>02</span><div><h2>复核与编辑</h2><p>规则生成结果需人工复核。勾选最终需要导出的条目。</p></div></div><div class="questionnaire-counts"><b>${questionnaireState.quantitative.length}</b> 个定量字段 · <b>${questionnaireState.qualitative.length}</b> 个问卷题目</div></div>
    <section class="work-panel"><div class="result-toolbar"><div><h2>定量数据收集表</h2><p>字段、数据类型、单位、统计口径、时间范围和必填状态均可修改。</p></div><label class="select-all"><input type="checkbox" data-select-all="quant" checked> 全选</label></div>${renderQuantitativeTable()}</section>
    <section class="work-panel"><div class="result-toolbar"><div><h2>全量指标问卷</h2><p>定量和定性指标都会生成问题。逐题选择一种表达，也可直接修改或刷新。</p></div><label class="select-all"><input type="checkbox" data-select-all="qual" checked> 全选</label></div><div class="qualitative-list">${questionnaireState.qualitative.map(renderQualitativeCard).join('')}</div></section>
    <section class="work-panel questionnaire-export"><div class="questionnaire-step"><span>03</span><div><h2>导出成果</h2><p>仅导出已勾选的条目。Word 包含全部入选问题；Excel 分为定量收集表和全量问卷两个工作表。</p></div></div><div><button class="mini-btn" type="button" id="exportQuestionnaireWord">下载 Word</button><button class="run-btn" type="button" id="exportQuestionnaireExcel">下载 Excel</button></div></section>`;
  bindQuestionnaireResults();
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderQuantitativeTable() {
  if (!questionnaireState.quantitative.length) return '<div class="empty-search">未识别到定量条目，可补充包含数值、单位、比例或时间范围的要求。</div>';
  return `<div class="questionnaire-table-wrap"><table class="questionnaire-table"><thead><tr><th>纳入</th><th>字段</th><th>数据类型</th><th>单位</th><th>统计口径</th><th>时间范围</th><th>必填</th></tr></thead><tbody>${questionnaireState.quantitative.map((item, i) => `<tr><td><input type="checkbox" data-qfield="included" data-kind="quantitative" data-index="${i}" ${item.included ? 'checked' : ''}></td><td><textarea data-qfield="field" data-kind="quantitative" data-index="${i}">${escapeQuestionnaire(item.field)}</textarea></td><td><select data-qfield="type" data-kind="quantitative" data-index="${i}">${['数值','百分比','整数','金额','日期','文本'].map(v => `<option ${v === item.type ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td><input value="${escapeQuestionnaire(item.unit)}" data-qfield="unit" data-kind="quantitative" data-index="${i}"></td><td><textarea data-qfield="calibre" data-kind="quantitative" data-index="${i}">${escapeQuestionnaire(item.calibre)}</textarea></td><td><input value="${escapeQuestionnaire(item.period)}" data-qfield="period" data-kind="quantitative" data-index="${i}"></td><td><select data-qfield="required" data-kind="quantitative" data-index="${i}"><option ${item.required === '是' ? 'selected' : ''}>是</option><option ${item.required === '否' ? 'selected' : ''}>否</option></select></td></tr>`).join('')}</tbody></table></div>`;
}

function renderQualitativeCard(item, i) {
  return `<article class="question-card"><div class="question-card-head"><label><input type="checkbox" data-qfield="included" data-kind="qualitative" data-index="${i}" ${item.included ? 'checked' : ''}> 纳入导出</label><span>${item.id} · ${escapeQuestionnaire(item.type || '定性')}</span><button class="mini-btn" type="button" data-refresh-question="${i}">刷新三个版本</button></div><div class="question-topic">原始指标：${escapeQuestionnaire(item.topic)}${item.definition ? ` · 口径：${escapeQuestionnaire(item.definition)}` : ''}</div><div class="question-variants">${item.variants.map((variant, v) => `<label class="question-variant"><input type="radio" name="variant-${i}" data-select-variant="${i}" value="${v}" ${v === item.selected ? 'checked' : ''}><span>${['正式简洁','友好访谈','专业深入'][v]}</span><textarea data-variant-edit="${i}" data-variant-index="${v}">${escapeQuestionnaire(variant)}</textarea></label>`).join('')}</div></article>`;
}

function bindQuestionnaireResults() {
  const root = document.querySelector('#questionnaireResults');
  root.addEventListener('input', updateQuestionnaireState);
  root.addEventListener('change', updateQuestionnaireState);
  root.querySelectorAll('[data-select-all]').forEach(box => box.addEventListener('change', event => {
    const key = event.target.dataset.selectAll === 'quant' ? 'quantitative' : 'qualitative';
    questionnaireState[key].forEach(item => { item.included = event.target.checked; }); renderQuestionnaireResults();
  }));
  root.querySelectorAll('[data-refresh-question]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.refreshQuestion), item = questionnaireState.qualitative[index];
    item.refresh = (item.refresh || 0) + 1; item.variants = makeQuestionVariants(item.topic, item.refresh, item); item.selected = 0; renderQuestionnaireResults();
  }));
  document.querySelector('#exportQuestionnaireWord').addEventListener('click', exportQuestionnaireWord);
  document.querySelector('#exportQuestionnaireExcel').addEventListener('click', exportQuestionnaireExcel);
}

function updateQuestionnaireState(event) {
  const el = event.target, kind = el.dataset.kind;
  if (kind && el.dataset.qfield) questionnaireState[kind][Number(el.dataset.index)][el.dataset.qfield] = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.selectVariant !== undefined) questionnaireState.qualitative[Number(el.dataset.selectVariant)].selected = Number(el.value);
  if (el.dataset.variantEdit !== undefined) questionnaireState.qualitative[Number(el.dataset.variantEdit)].variants[Number(el.dataset.variantIndex)] = el.value;
}

function selectedQuestionnaireData() {
  return { quantitative: questionnaireState.quantitative.filter(item => item.included), qualitative: questionnaireState.qualitative.filter(item => item.included) };
}

function exportQuestionnaireWord() {
  const data = selectedQuestionnaireData();
  if (!data.quantitative.length && !data.qualitative.length) { showToast('请至少勾选一个导出条目'); return; }
  const rows = data.quantitative.map((item, i) => `<tr><td>${i + 1}</td><td>${escapeQuestionnaire(item.field)}</td><td>${item.type}</td><td>${escapeQuestionnaire(item.unit)}</td><td>${escapeQuestionnaire(item.calibre)}</td><td>${escapeQuestionnaire(item.period)}</td><td>${item.required}</td><td></td></tr>`).join('');
  const questions = data.qualitative.map((item, i) => `<p><b>${i + 1}. ${escapeQuestionnaire(item.variants[item.selected])}</b><br><small>${escapeQuestionnaire(item.id)} · ${escapeQuestionnaire(item.topic)}</small></p><p style="height:56px;border-bottom:1px solid #ccc"></p>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Microsoft YaHei',sans-serif;color:#182b43;line-height:1.7}h1{color:#224d82;border-bottom:3px solid #f0cd56;padding-bottom:12px}h2{margin-top:28px;color:#224d82}small{color:#657386}table{border-collapse:collapse;width:100%;font-size:10pt}th,td{border:1px solid #b8c4d0;padding:7px;vertical-align:top}th{background:#224d82;color:#fff}</style></head><body><h1>${escapeQuestionnaire(questionnaireState.title)}</h1><p>生成方式：商道 AI 工作台本机规则辅助生成；请在使用前完成人工复核。</p><h2>一、定量数据收集表</h2>${rows ? `<table><tr><th>序号</th><th>字段</th><th>类型</th><th>单位</th><th>统计口径</th><th>时间范围</th><th>必填</th><th>填报值</th></tr>${rows}</table>` : '<p>无入选条目</p>'}<h2>二、全量指标问卷</h2>${questions || '<p>无入选条目</p>'}</body></html>`;
  downloadQuestionnaireBlob(new Blob(['\ufeff', html], { type: 'application/msword' }), `${safeQuestionnaireName(questionnaireState.title)}.doc`);
}

function exportQuestionnaireExcel() {
  const data = selectedQuestionnaireData();
  if (!data.quantitative.length && !data.qualitative.length) { showToast('请至少勾选一个导出条目'); return; }
  const sheets = [
    { name: '定量收集表', rows: [['序号','字段','数据类型','单位','统计口径','时间范围','是否必填','填报值'], ...data.quantitative.map((x,i) => [i+1,x.field,x.type,x.unit,x.calibre,x.period,x.required,''])] },
    { name: '全量指标问卷', rows: [['序号','指标编号','数据类型','原始指标','问卷题目','回答'], ...data.qualitative.map((x,i) => [i+1,x.id,x.type,x.topic,x.variants[x.selected],''])] }
  ];
  downloadQuestionnaireWorkbook(sheets, `${safeQuestionnaireName(questionnaireState.title)}.xlsx`);
}

function downloadQuestionnaireWorkbook(sheets, filename) {
  const xml = value => escapeQuestionnaire(String(value ?? '')).replaceAll('"', '&quot;');
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF224D82"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="2" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>'
  };
  sheets.forEach((sheet, si) => { const body = sheet.rows.map((row,ri)=>`<row r="${ri+1}" ht="${ri ? 42 : 28}" customHeight="1">${row.map((v,ci)=>`<c r="${String.fromCharCode(65+ci)}${ri+1}" s="${ri ? 0 : 1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join(''); files[`xl/worksheets/sheet${si+1}.xml`] = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols>${sheet.rows[0].map((_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===1?42:i===4?34:16}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${String.fromCharCode(64+sheet.rows[0].length)}${sheet.rows.length}"/></worksheet>`; });
  downloadQuestionnaireBlob(new Blob([xlsxZip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

function downloadQuestionnaireBlob(blob, filename) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeQuestionnaireName(value) { return value.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60) || '项目资料收集问卷'; }
function escapeQuestionnaire(value) { return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
