const questionnaireState = { quantitative: [], qualitative: [], title: '项目资料收集问卷' };

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
    <div class="workspace-hero"><div class="workspace-title"><span class="tool-icon">问</span><div><h1>问卷生成</h1><span class="workspace-title-en">QUESTIONNAIRE BUILDER</span><p>将已有项目信息整理为定量数据收集表和定性问卷。</p></div></div><span class="prototype-tag ready-tag">可试用 · 本机处理</span></div>
    <div class="questionnaire-boundary"><strong>当前能力</strong> 规则辅助识别、编辑与导出均在浏览器本机完成，不上传资料、不调用模型。三种问法由预设表达规则生成；模型理解、PDF / Word 内容解析待安全环境与 API 配置后接入。</div>
    <section class="work-panel questionnaire-source">
      <div class="questionnaire-step"><span>01</span><div><h2>导入项目信息</h2><p>粘贴文字，或读取本机 TXT、MD、CSV、JSON 文件。建议每个要求单独一行。</p></div></div>
      <label class="field"><span>问卷名称</span><input id="questionnaireTitle" value="项目资料收集问卷" maxlength="80"></label>
      <label class="field"><span>已有项目信息</span><textarea id="questionnaireSource" rows="9" placeholder="粘贴项目背景、指标要求或访谈提纲……">${questionnaireSamples}</textarea></label>
      <div class="questionnaire-source-actions"><label class="mini-btn file-button">读取文本文件<input id="questionnaireFile" type="file" accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json"></label><button class="run-btn" id="generateQuestionnaire" type="button">识别并生成</button></div>
      <div id="questionnaireFileNote" class="hint">资料仅在当前浏览器页面中处理；请勿在公开演示站处理机密或个人敏感信息。</div>
    </section>
    <section id="questionnaireResults" class="questionnaire-results" hidden></section>
  </section>`;
  document.querySelector('#generateQuestionnaire').addEventListener('click', generateQuestionnaire);
  document.querySelector('#questionnaireFile').addEventListener('change', readQuestionnaireFile);
}

async function readQuestionnaireFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const note = document.querySelector('#questionnaireFileNote');
  if (file.size > 2 * 1024 * 1024) { note.textContent = '文件超过 2 MB，请精简后再试。'; return; }
  try {
    document.querySelector('#questionnaireSource').value = await file.text();
    note.textContent = `已在本机读取 ${file.name}（${Math.ceil(file.size / 1024)} KB），尚未上传。`;
  } catch { note.textContent = '无法读取该文件，请改为粘贴纯文本。'; }
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
    else questionnaireState.qualitative.push(toQualitative(text, index));
  });
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

function toQualitative(text, index) {
  const topic = cleanItemName(text);
  return { id: `Q${index + 1}`, included: true, topic, variants: makeQuestionVariants(topic, 0), selected: 0 };
}

function makeQuestionVariants(topic, refresh) {
  const seed = refresh % 3;
  const groups = [
    [`请简要说明${topic.replace(/[？?]$/, '')}。`, `能否介绍一下${topic.replace(/[？?]$/, '')}？`, `请结合实际案例，说明${topic.replace(/[？?]$/, '')}，包括主要做法与成效。`],
    [`请概述${topic.replace(/[？?]$/, '')}。`, `关于${topic.replace(/[？?]$/, '')}，您方便分享一下当前情况吗？`, `请系统说明${topic.replace(/[？?]$/, '')}，并列出关键机制、进展及待改进事项。`],
    [`请说明${topic.replace(/[？?]$/, '')}的现状。`, `您会如何描述${topic.replace(/[？?]$/, '')}？`, `请从制度、执行和成效三个方面说明${topic.replace(/[？?]$/, '')}。`]
  ];
  return groups[seed];
}

function renderQuestionnaireResults() {
  const root = document.querySelector('#questionnaireResults');
  root.hidden = false;
  root.innerHTML = `<div class="questionnaire-result-head"><div class="questionnaire-step"><span>02</span><div><h2>复核与编辑</h2><p>识别结果需人工复核。勾选最终需要导出的条目。</p></div></div><div class="questionnaire-counts"><b>${questionnaireState.quantitative.length}</b> 个定量字段 · <b>${questionnaireState.qualitative.length}</b> 个定性问题</div></div>
    <section class="work-panel"><div class="result-toolbar"><div><h2>定量数据收集表</h2><p>字段、数据类型、单位、统计口径、时间范围和必填状态均可修改。</p></div><label class="select-all"><input type="checkbox" data-select-all="quant" checked> 全选</label></div>${renderQuantitativeTable()}</section>
    <section class="work-panel"><div class="result-toolbar"><div><h2>定性问卷</h2><p>逐题选择一种表达，也可直接修改；刷新会生成另一组三种表达。</p></div><label class="select-all"><input type="checkbox" data-select-all="qual" checked> 全选</label></div><div class="qualitative-list">${questionnaireState.qualitative.map(renderQualitativeCard).join('')}</div></section>
    <section class="work-panel questionnaire-export"><div class="questionnaire-step"><span>03</span><div><h2>导出成果</h2><p>仅导出已勾选的条目。Word 包含问卷说明与全部入选内容；Excel 分为定量收集表和定性问卷两个工作表。</p></div></div><div><button class="mini-btn" type="button" id="exportQuestionnaireWord">下载 Word</button><button class="run-btn" type="button" id="exportQuestionnaireExcel">下载 Excel</button></div></section>`;
  bindQuestionnaireResults();
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderQuantitativeTable() {
  if (!questionnaireState.quantitative.length) return '<div class="empty-search">未识别到定量条目，可补充包含数值、单位、比例或时间范围的要求。</div>';
  return `<div class="questionnaire-table-wrap"><table class="questionnaire-table"><thead><tr><th>纳入</th><th>字段</th><th>数据类型</th><th>单位</th><th>统计口径</th><th>时间范围</th><th>必填</th></tr></thead><tbody>${questionnaireState.quantitative.map((item, i) => `<tr><td><input type="checkbox" data-qfield="included" data-kind="quantitative" data-index="${i}" ${item.included ? 'checked' : ''}></td><td><textarea data-qfield="field" data-kind="quantitative" data-index="${i}">${escapeQuestionnaire(item.field)}</textarea></td><td><select data-qfield="type" data-kind="quantitative" data-index="${i}">${['数值','百分比','整数','金额','日期','文本'].map(v => `<option ${v === item.type ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td><input value="${escapeQuestionnaire(item.unit)}" data-qfield="unit" data-kind="quantitative" data-index="${i}"></td><td><textarea data-qfield="calibre" data-kind="quantitative" data-index="${i}">${escapeQuestionnaire(item.calibre)}</textarea></td><td><input value="${escapeQuestionnaire(item.period)}" data-qfield="period" data-kind="quantitative" data-index="${i}"></td><td><select data-qfield="required" data-kind="quantitative" data-index="${i}"><option ${item.required === '是' ? 'selected' : ''}>是</option><option ${item.required === '否' ? 'selected' : ''}>否</option></select></td></tr>`).join('')}</tbody></table></div>`;
}

function renderQualitativeCard(item, i) {
  return `<article class="question-card"><div class="question-card-head"><label><input type="checkbox" data-qfield="included" data-kind="qualitative" data-index="${i}" ${item.included ? 'checked' : ''}> 纳入导出</label><span>${item.id}</span><button class="mini-btn" type="button" data-refresh-question="${i}">刷新三个版本</button></div><div class="question-topic">原始条目：${escapeQuestionnaire(item.topic)}</div><div class="question-variants">${item.variants.map((variant, v) => `<label class="question-variant"><input type="radio" name="variant-${i}" data-select-variant="${i}" value="${v}" ${v === item.selected ? 'checked' : ''}><span>${['正式简洁','友好访谈','专业深入'][v]}</span><textarea data-variant-edit="${i}" data-variant-index="${v}">${escapeQuestionnaire(variant)}</textarea></label>`).join('')}</div></article>`;
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
    item.refresh = (item.refresh || 0) + 1; item.variants = makeQuestionVariants(item.topic, item.refresh); item.selected = 0; renderQuestionnaireResults();
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
  const questions = data.qualitative.map((item, i) => `<p><b>${i + 1}. ${escapeQuestionnaire(item.variants[item.selected])}</b></p><p style="height:56px;border-bottom:1px solid #ccc"></p>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Microsoft YaHei',sans-serif;color:#182b43;line-height:1.7}h1{color:#224d82;border-bottom:3px solid #f0cd56;padding-bottom:12px}h2{margin-top:28px;color:#224d82}table{border-collapse:collapse;width:100%;font-size:10pt}th,td{border:1px solid #b8c4d0;padding:7px;vertical-align:top}th{background:#224d82;color:#fff}</style></head><body><h1>${escapeQuestionnaire(questionnaireState.title)}</h1><p>生成方式：商道 AI 工作台本机规则辅助生成；请在使用前完成人工复核。</p><h2>一、定量数据收集表</h2>${rows ? `<table><tr><th>序号</th><th>字段</th><th>类型</th><th>单位</th><th>统计口径</th><th>时间范围</th><th>必填</th><th>填报值</th></tr>${rows}</table>` : '<p>无入选条目</p>'}<h2>二、定性问卷</h2>${questions || '<p>无入选条目</p>'}</body></html>`;
  downloadQuestionnaireBlob(new Blob(['\ufeff', html], { type: 'application/msword' }), `${safeQuestionnaireName(questionnaireState.title)}.doc`);
}

function exportQuestionnaireExcel() {
  const data = selectedQuestionnaireData();
  if (!data.quantitative.length && !data.qualitative.length) { showToast('请至少勾选一个导出条目'); return; }
  const sheets = [
    { name: '定量收集表', rows: [['序号','字段','数据类型','单位','统计口径','时间范围','是否必填','填报值'], ...data.quantitative.map((x,i) => [i+1,x.field,x.type,x.unit,x.calibre,x.period,x.required,''])] },
    { name: '定性问卷', rows: [['序号','问卷题目','回答'], ...data.qualitative.map((x,i) => [i+1,x.variants[x.selected],''])] }
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
