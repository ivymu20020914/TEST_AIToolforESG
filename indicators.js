const indicatorStandards = {
  syntaogf_esg: '商道融绿',
  wind_esg: 'Wind',
  a_share_pending: 'A 股（交易所及条款待核对）',
  msci_esg: 'MSCI',
  ecovadis: 'EcoVadis',
  gri: 'GRI',
  ifrs_s1: 'IFRS S1',
  ifrs_s2: 'IFRS S2',
  vsme: 'VSME'
};

let indicatorDataRequest;

function loadIndicators() {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const dataPath = local ? './local_data/esg-indicators.json' : './data/esg-indicators.json';
  indicatorDataRequest ??= fetch(dataPath, { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('指标字典未加载');
      return response.json();
    })
    .catch(error => {
      indicatorDataRequest = undefined;
      throw error;
    });
  return indicatorDataRequest;
}

function renderIndicatorWorkspace() {
  document.querySelector('#pageCrumb').textContent = 'ESG 指标表生成';
  app.replaceChildren(workspaceTemplate.content.cloneNode(true));
  app.querySelector('.workspace-page').classList.add('indicator-page');
  const workspace = app.querySelector('#workspaceContent');
  workspace.innerHTML = `
    <div class="workspace-hero">
      <div class="workspace-title"><span class="tool-icon">表</span><div><h1>ESG 指标表生成</h1><span class="workspace-title-en" lang="en">ESG Indicator Builder</span><p>选择适用要求生成指标表。反馈时请说明指标名称、所选标准和建议。</p></div></div>
      <span class="prototype-tag">试用版 · 欢迎反馈</span>
    </div>
    <div class="workspace-grid indicator-workspace">
      <form class="work-panel">
        <h2>生成条件</h2>
        <div class="field"><label for="indicatorCompany">公司名称（选填）</label><input id="indicatorCompany" name="company" placeholder="默认使用「公司」" /></div>
        <fieldset class="indicator-options">
          <legend>对标要求（可多选）</legend>
          ${Object.entries(indicatorStandards).map(([id, label]) => `<label><input type="checkbox" name="standard" value="${id}" /> ${label}</label>`).join('')}
        </fieldset>
        <button class="run-btn" type="submit">生成指标表</button>
        <div class="hint">常规项每次自动纳入。GRI、IFRS S1/S2、VSME 为首批映射，请核对适用条件。行业适用性待业务确认。</div>
      </form>
      <section class="work-panel result-panel">
        <div class="result-toolbar"><h2>指标表预览</h2><div class="indicator-downloads"><button class="mini-btn" type="button" data-export="csv" disabled>下载 CSV</button><button class="mini-btn excel-btn" type="button" data-export="xlsx" disabled>下载 Excel</button></div></div>
        <p role="status">选择对标要求，或直接生成仅含常规项的指标表。</p>
        <div class="indicator-filter indicator-search">
          <label for="indicatorSearch">搜索指标</label>
          <input id="indicatorSearch" type="search" placeholder="输入指标名称、编号或议题" disabled />
          <span class="indicator-search-count" role="status"></span>
        </div>
        <div class="indicator-filter">
          <label for="indicatorDimension">ESG 维度</label>
          <select id="indicatorDimension" disabled>
            <option value="">全部维度</option>
            <option value="环境">E · 环境</option>
            <option value="社会">S · 社会</option>
            <option value="治理">G · 治理</option>
            <option value="经营绩效">经营绩效</option>
          </select>
          <label for="indicatorTopic">大议题</label>
          <select id="indicatorTopic" disabled><option value="">全部大议题</option></select>
          <label for="indicatorType">数据类型</label>
          <select id="indicatorType" disabled>
            <option value="">全部类型</option>
            <option value="定量">定量</option>
            <option value="定性">定性</option>
          </select>
          <span class="indicator-filter-count" role="status"></span>
        </div>
        <div class="indicator-preview"></div>
      </section>
    </div>`;

  const form = workspace.querySelector('form');
  const run = form.querySelector('button');
  const status = workspace.querySelector('[role="status"]');
  const download = workspace.querySelector('[data-export=csv]');
  const excelDownload = workspace.querySelector('[data-export=xlsx]');
  const preview = workspace.querySelector('.indicator-preview');
  const search = workspace.querySelector('#indicatorSearch');
  const searchCount = workspace.querySelector('.indicator-search-count');
  const dimensionFilter = workspace.querySelector('#indicatorDimension');
  const topicFilter = workspace.querySelector('#indicatorTopic');
  const typeFilter = workspace.querySelector('#indicatorType');
  const filterCount = workspace.querySelector('.indicator-filter-count');
  let displayed = [];
  let filteredItems = [];
  let refreshExportSelection;

  function matchesDimension(item) {
    return !dimensionFilter.value || splitIndicatorCategories(item.dimension).includes(dimensionFilter.value);
  }

  function updateTopicOptions() {
    const selected = topicFilter.value;
    const topics = [...new Set(displayed.filter(matchesDimension).flatMap(item => splitIndicatorCategories(item.topic)))];
    topics.sort((a, b) => a.localeCompare(b, 'zh-CN'));
    topicFilter.replaceChildren(new Option('全部大议题', ''), ...topics.map(topic => new Option(topic, topic)));
    if (topics.includes(selected)) topicFilter.value = selected;
    topicFilter.disabled = topics.length === 0;
  }

  function searchPreview() {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    preview.querySelectorAll('tbody tr').forEach((row, index) => {
      const item = displayed[index];
      const found = item.matchesFilters
        && (!query || [item.id, item.name, item.topic].some(value => value?.toLowerCase().includes(query)));
      row.hidden = !found;
      if (found) matches++;
    });
    searchCount.textContent = query ? `找到 ${matches} 条 · 搜索仅用于查看` : '';
  }

  function filterPreview() {
    filteredItems = displayed.filter(item => {
      item.matchesFilters = matchesDimension(item)
        && (!topicFilter.value || splitIndicatorCategories(item.topic).includes(topicFilter.value))
        && (!typeFilter.value || item.type?.split('/').includes(typeFilter.value));
      return item.matchesFilters;
    });
    filterCount.textContent = dimensionFilter.value || topicFilter.value || typeFilter.value
      ? `筛选 ${filteredItems.length} / ${displayed.length} 条 · 导出按筛选和勾选` : '';
    searchPreview();
    refreshExportSelection();
  }

  search.addEventListener('input', searchPreview);
  dimensionFilter.addEventListener('change', () => {
    updateTopicOptions();
    filterPreview();
  });
  topicFilter.addEventListener('change', filterPreview);
  typeFilter.addEventListener('change', filterPreview);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (run.disabled) return;
    const values = new FormData(form);
    const selected = values.getAll('standard');
    const company = values.get('company').trim() || '公司';
    run.disabled = download.disabled = excelDownload.disabled = search.disabled = dimensionFilter.disabled = topicFilter.disabled = typeFilter.disabled = true;
    filterCount.textContent = searchCount.textContent = '';
    preview.replaceChildren();
    status.textContent = '正在读取指标字典…';
    try {
      const dictionary = await loadIndicators();
      displayed = dictionary
        .filter(item => (item.alwaysInclude || !item.standards.length) || item.standards.some(key => selected.includes(key)))
        .map(item => ({
          ...item,
          includeInExport: true,
          selectedStandards: selected,
          standardReference: indicatorStandardReference(item, selected),
          matched: item.standards.filter(key => selected.includes(key)).map(key => indicatorStandards[key]).join('、') || '常规项',
          definition: fillCompany(item.definition, company)
        }));
      refreshExportSelection = renderIndicatorRows(preview, displayed, company, count => {
        download.disabled = excelDownload.disabled = count === 0;
        download.textContent = `下载 CSV（${count} 条）`;
        excelDownload.textContent = `下载 Excel（${count} 条）`;
      });
      search.disabled = dimensionFilter.disabled = typeFilter.disabled = displayed.length === 0;
      updateTopicOptions();
      filterPreview();
      const commonCount = displayed.filter(item => (item.alwaysInclude || !item.standards.length)).length;
      status.textContent = `共 ${displayed.length} 条，常规项 ${commonCount} 条，所选要求追加 ${displayed.length - commonCount} 条。`;
    } catch {
      status.textContent = '指标字典加载失败，请刷新页面后重试。';
    } finally {
      run.disabled = false;
    }
  });

  for (const button of [download, excelDownload]) {
    button.addEventListener('click', () => {
      const selected = filteredItems.filter(item => item.includeInExport);
      if (!selected.length) return;
      if (button === excelDownload) downloadIndicatorExcel(selected);
      else downloadIndicatorCsv(selected);
    });
  }
}

function indicatorStandardReference(item, selected) {
  const sources = item.standardSources || [];
  const matched = sources.filter(source => selected.includes(source.standard));
  return (matched.length ? matched : sources).map(source =>
    `${source.name}（${source.version}）
${source.reference}
适用条件：${source.condition}`
    + `
官方标签：${source.originalLabel}
官方原文说明：${source.originalDefinition || '未单列'}`
    + `
官方计量提示：${source.measurement || '未单列'}
中文表述：${source.translationNote || '中文整理'}`
  ).join('\n\n');
}

function standardReferenceLabel(standard, reference) {
  const part = name => reference?.match(new RegExp('(?:^|; )' + name + '=([^;\\n]+)'))?.[1] || '';
  const number = part('Number');
  const paragraph = part('Paragraph');
  const name = indicatorStandards[standard];
  if (standard === 'gri') return [name, number].filter(Boolean).join(' ');
  if (standard === 'vsme') return [name, number, paragraph ? '第' + paragraph + '段' : ''].filter(Boolean).join(' ');
  const subdivisions = ['Subparagraph', 'Clause', 'Subclause'].map(part).filter(Boolean).map(value => '(' + value + ')').join('');
  return [name, paragraph + subdivisions].filter(Boolean).join(' ');
}

function splitIndicatorCategories(value) {
  return (value || '').split('|').map(part => part.trim()).filter(Boolean);
}

function fillCompany(text, company) {
  return (text || '').replaceAll('{{company_name}}', () => company);
}

const indicatorColumns = [
  ['id', '指标编号'], ['type', '数据类型'], ['dimension', '维度'],
  ['topic', '议题'], ['category', '上级指标'], ['name', '指标名称'],
  ['unit', '单位'], ['definition', '定义与统计口径'],
  ['matched', '本次纳入依据'], ['note', '口径核对'], ['standardReference', '标准条款及适用条件'], ['scopeSource', '所选口径来源']
];
const previewColumns = indicatorColumns.filter(([key]) => ['type', 'name', 'unit', 'definition', 'matched'].includes(key));

function renderIndicatorRows(preview, items, company, onExportCount) {
  const table = document.createElement('table');
  table.className = 'fake-table';
  const header = table.createTHead().insertRow();
  const exportHeading = document.createElement('th');
  exportHeading.scope = 'col';
  exportHeading.className = 'indicator-export';
  const selectAll = exportCheckbox('全选当前筛选结果导出');
  exportHeading.append(selectAll, '导出');
  header.append(exportHeading);
  for (const [, label] of previewColumns) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
  }

  const body = table.createTBody();
  const rowChecks = [];
  function updateExportCount() {
    const visible = items.filter(item => item.matchesFilters);
    const count = visible.filter(item => item.includeInExport).length;
    selectAll.checked = visible.length > 0 && count === visible.length;
    selectAll.indeterminate = count > 0 && count < visible.length;
    selectAll.disabled = visible.length === 0;
    onExportCount(count);
  }

  for (const item of items) {
    const row = body.insertRow();
    const exportCell = row.insertCell();
    exportCell.className = 'indicator-export';
    const check = exportCheckbox(`导出 ${item.name}`);
    check.checked = item.includeInExport;
    check.addEventListener('change', () => {
      item.includeInExport = check.checked;
      updateExportCount();
    });
    exportCell.append(check);
    rowChecks.push(check);

    const cells = {};
    for (const [key] of previewColumns) {
      const cell = row.insertCell();
      cells[key] = cell;
      cell.textContent = item[key] || '—';
      if (key === 'name') {
        const identifier = document.createElement('small');
        identifier.className = 'indicator-id';
        identifier.textContent = item.id;
        cell.append(identifier);
      }
    }
    renderIndicatorDefinition(item, cells, company);
  }

  selectAll.addEventListener('change', () => {
    items.forEach((item, index) => {
      if (item.matchesFilters) item.includeInExport = rowChecks[index].checked = selectAll.checked;
    });
    updateExportCount();
  });
  preview.replaceChildren(table);
  return updateExportCount;
}

function exportCheckbox(label) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.setAttribute('aria-label', label);
  return checkbox;
}

function renderIndicatorDefinition(item, cells, company) {
  const cell = cells.definition;
  const definition = document.createElement('div');
  definition.className = 'indicator-definition';
  const edit = document.createElement('details');
  edit.className = 'indicator-definition-edit';
  const summary = document.createElement('summary');
  summary.textContent = '编辑定义与口径';
  const input = document.createElement('textarea');
  input.rows = 3;
  input.setAttribute('aria-label', `${item.name}定义与统计口径`);
  edit.append(summary, input);
  cell.replaceChildren(definition, edit);
  if (item.note) cell.title = item.note;

  const variants = item.variants || [];
  const selectedVariants = variants.filter(variant => variant.standard && item.selectedStandards.includes(variant.standard));
  const otherStandards = variants.filter(variant => variant.standard && !item.selectedStandards.includes(variant.standard));
  const projectVariants = variants.filter(variant => !variant.standard);
  const choices = [...selectedVariants, ...otherStandards, ...projectVariants]
    .filter(variant => variant.definition?.trim() || variant.note?.startsWith('可选口径：'));
  const hasChoices = choices.length && (choices.some(variant => variant.standard) || !item.unit || !item.definition || item.note?.includes('可选口径'));
  const scopes = hasChoices ? choices.map(variant => {
    const detail = fillCompany(variant.definition, company);
    const scope = variant.note?.startsWith('可选口径：') ? variant.note.slice(5) : detail;
    return { unit: variant.unit, scope, definition: detail || scope,
      standard: variant.standard, reference: variant.reference };
  }) : [{ unit: item.unit, definition: item.definition }];
  if (item.mergeDetails?.length) {
    const merged = document.createElement('details');
    merged.className = 'indicator-standard-source';
    const heading = document.createElement('summary');
    heading.textContent = `已合并 ${item.mergeDetails.length} 项 · 查看明细`;
    const detail = document.createElement('div');
    detail.textContent = item.mergeKind + '\n' + item.mergeDetails.map(source => `${source.id} ${source.name}`).join('\n');
    merged.append(heading, detail);
    cell.append(merged);
  }
  const sourceDetails = document.createElement('details');
  sourceDetails.className = 'indicator-standard-source';
  if (item.standardReference) {
    const heading = document.createElement('summary');
    heading.textContent = '标准条款与适用条件';
    const text = document.createElement('div');
    text.textContent = item.standardReference;
    sourceDetails.append(heading, text);
    cell.append(sourceDetails);
  }
  const scopeSource = document.createElement('div');
  scopeSource.className = 'indicator-scope-source';
  cell.insertBefore(scopeSource, edit);
  let active = scopes[0];

  function showDefinition() {
    const shown = active.edited ? item.definition : active.scope || item.definition;
    const current = active.scope
      ? '当前口径：' + [item.unit, shown].filter(Boolean).join(' · ')
      : shown;
    definition.textContent = current || '—';
    if (!active.edited && active.scope && active.scope !== item.definition) {
      definition.textContent += '\n' + item.definition;
    }
  }

  function applyScope() {
    item.unit = active.unit;
    item.definition = [active.definition, item.collectionRequirements ? '合并收集要求（非标准原文）：' + item.collectionRequirements : ''].filter(Boolean).join('\n\n');
    cells.unit.textContent = item.unit || '—';
    input.value = item.definition || '';
    item.scopeSource = active.standard ? standardReferenceLabel(active.standard, active.reference) : '历史项目口径';
    scopeSource.textContent = active.standard ? `依据 ${item.scopeSource} 整理，可编辑` : '';
    showDefinition();
  }

  if (hasChoices) {
    const choice = document.createElement('select');
    choice.setAttribute('aria-label', `${item.name}统计口径`);
    for (const { unit, scope, standard } of scopes) {
      const label = [unit, scope].filter(Boolean).join(' · ').replace(/\s+/g, ' ');
      const option = new Option(label.length > 120 ? label.slice(0, 119) + '…' : label);
      option.title = standard ? indicatorStandards[standard] + ' · ' + label : label;
      choice.add(option);
    }
    cell.insertBefore(choice, edit);
    choice.addEventListener('change', () => {
      active = scopes[choice.selectedIndex];
      applyScope();
    });
  }
  input.addEventListener('input', () => {
    item.definition = active.definition = input.value;
    active.edited = true;
    showDefinition();
  });
  applyScope();
}

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function downloadIndicatorCsv(items) {
  const rows = [indicatorColumns.map(([, label]) => label), ...items.map(item => indicatorColumns.map(([key]) => item[key]))];
  const blob = new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ESG指标表.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
