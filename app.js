const tools = [
  { id: 'esg', icon: 'E', title: 'ESG 同业报告对标', desc: '对比同行披露表现，快速定位差距与可借鉴实践。', tag: '研究分析', color: '#3157d5', tint: '#eaf0ff' },
  { id: 'research', icon: '⌁', title: '产业链 / 行业调研', desc: '从公开资料生成产业链图谱、趋势摘要与研究线索。', tag: '研究分析', color: '#168b72', tint: '#e4f6f0' },
  { id: 'word', icon: 'W', title: 'Word 格式转换', desc: '把原始材料整理为规范的报告结构与统一格式。', tag: '文档处理', color: '#4269c9', tint: '#e9effc' },
  { id: 'ppt', icon: 'P', title: 'PPT 模板生成', desc: '根据主题与受众，生成可编辑的汇报结构和示例页面。', tag: '内容生成', color: '#d27836', tint: '#fff0e4' },
  { id: 'assistant', icon: '✦', title: '专业 AI 助手', desc: '使用团队预设的专业方法与表达规范进行问答。', tag: '智能问答', color: '#7a56cb', tint: '#f1eaff' },
  { id: 'projects', icon: '◇', title: '项目空间 / 团队记忆', desc: '按项目沉淀共识、模板和已确认的团队知识。', tag: '团队协作', color: '#c45c76', tint: '#fdebf0' }
];

const configs = {
  esg: { title: 'ESG 同业报告对标', subtitle: '上传样本后，模拟识别披露主题、指标与差距。', inputTitle: '创建对标任务', inputDesc: '选择行业与分析范围，本原型不会读取文件内容。', action: '生成模拟对标', fields: [['行业范围','select',['新能源汽车','消费电子','商业地产']],['重点议题','select',['气候变化与碳排放','供应链责任','员工发展与多元化']]], upload: true },
  research: { title: '产业链 / 行业调研', subtitle: '用结构化框架整理行业格局、趋势与关键玩家。', inputTitle: '定义研究问题', inputDesc: '输入主题与关注维度，结果仅为界面演示。', action: '生成模拟研究', fields: [['研究主题','input','新型储能产业链'],['研究重点','textarea','市场格局、上游原材料、政策与技术趋势']] },
  word: { title: 'Word 格式转换', subtitle: '把材料整理成统一、清晰、可交付的报告格式。', inputTitle: '转换设置', inputDesc: '原型只显示文件名，不会上传、解析或保存文件。', action: '预览模拟文档', fields: [['目标模板','select',['公司标准研究报告','客户交付版报告','会议纪要模板']]], upload: true },
  ppt: { title: 'PPT 模板生成', subtitle: '根据主题生成一套可编辑的汇报逻辑与页面示例。', inputTitle: '定义演示文稿', inputDesc: '填写演示目标，生成虚构的页面结构预览。', action: '生成模拟 PPT', fields: [['汇报主题','input','零碳园区建设路线图'],['目标受众','select',['客户管理层','内部项目组','行业论坛']]], upload: true },
  assistant: { title: '专业 AI 助手', subtitle: '基于团队设定的方法、术语与权限边界进行问答。', inputTitle: '开始一个问题', inputDesc: '当前回答为固定演示内容，不调用任何大模型。', action: '生成模拟回答', fields: [['助手角色','select',['ESG 研究顾问','行业研究员','报告编辑']],['你的问题','textarea','请给出制造企业供应链尽责管理的分析框架。']] },
  projects: { title: '项目空间 / 团队记忆', subtitle: '把已确认的信息按项目和权限沉淀，供后续任务按需调用。', inputTitle: '项目设置', inputDesc: '静态原型不保存输入，也不包含真实团队资料。', action: '查看模拟项目', fields: [['当前项目','select',['青岚科技 ESG 报告（演示）','新能源趋势研究（演示）']],['记忆检索范围','select',['仅已确认信息','项目模板与术语','全部演示内容']]] }
};

const app = document.querySelector('#app');
const homeTemplate = document.querySelector('#homeTemplate');
const workspaceTemplate = document.querySelector('#workspaceTemplate');
const modalRoot = document.querySelector('#modalRoot');
const toast = document.querySelector('#toast');
let toastTimer;

function route() {
  const id = location.hash.replace('#/', '') || 'home';
  document.querySelectorAll('[data-route-link]').forEach(el => el.classList.toggle('active', el.dataset.routeLink === id || (id !== 'home' && id !== 'projects' && el.dataset.routeLink === 'home')));
  if (id === 'home') renderHome(); else if (configs[id]) renderWorkspace(id); else location.hash = '#/home';
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderHome() {
  document.querySelector('#pageCrumb').textContent = '工具中心';
  app.replaceChildren(homeTemplate.content.cloneNode(true));
  renderToolCards(tools);
  document.querySelector('#toolSearch').addEventListener('input', event => {
    const key = event.target.value.trim().toLowerCase();
    renderToolCards(tools.filter(tool => `${tool.title}${tool.desc}${tool.tag}`.toLowerCase().includes(key)));
  });
}

function renderToolCards(items) {
  const grid = document.querySelector('#toolGrid');
  if (!items.length) { grid.innerHTML = '<div class="empty-search">没有找到匹配的工具，试试“研究”或“文档”。</div>'; return; }
  grid.innerHTML = items.map(tool => `
    <button class="tool-card" type="button" data-route="${tool.id}" style="--card-color:${tool.color};--card-tint:${tool.tint}">
      <span class="tool-icon">${tool.icon}</span><h3>${tool.title}</h3><p>${tool.desc}</p>
      <span class="tool-meta"><span>${tool.tag}</span><strong>↗</strong></span>
    </button>`).join('');
}

function renderWorkspace(id) {
  const config = configs[id];
  const tool = tools.find(item => item.id === id);
  document.querySelector('#pageCrumb').textContent = config.title;
  app.replaceChildren(workspaceTemplate.content.cloneNode(true));
  const fields = config.fields.map(([label,type,value], index) => {
    if (type === 'select') return `<div class="field"><label for="field-${index}">${label}</label><select id="field-${index}">${value.map(item => `<option>${item}</option>`).join('')}</select></div>`;
    if (type === 'textarea') return `<div class="field"><label for="field-${index}">${label}</label><textarea id="field-${index}">${value}</textarea></div>`;
    return `<div class="field"><label for="field-${index}">${label}</label><input id="field-${index}" value="${value}" /></div>`;
  }).join('');
  const upload = config.upload ? `<label class="upload-zone"><input type="file" data-fake-upload /><span class="upload-glyph">⇧</span><strong>选择本机文件（仅演示）</strong><span>PDF / DOCX / XLSX · 不会上传或保存</span></label>` : '';
  document.querySelector('#workspaceContent').innerHTML = `
    <div class="workspace-hero">
      <div class="workspace-title"><span class="tool-icon" style="color:${tool.color};background:${tool.tint}">${tool.icon}</span><div><h1>${config.title}</h1><p>${config.subtitle}</p></div></div>
      <span class="prototype-tag">● 静态原型 · 假数据</span>
    </div>
    <div class="workspace-grid">
      <section class="work-panel"><h2>${config.inputTitle}</h2><p>${config.inputDesc}</p>${fields}${upload}<button class="run-btn" type="button" data-run-tool="${id}">${config.action}</button><div class="hint">安全提示：请勿在此原型中输入或选择真实客户资料、个人信息或密钥。</div></section>
      <section class="work-panel result-panel"><div class="result-toolbar"><h2>结果预览</h2><div><button class="mini-btn" data-action="show-toast" data-message="原型不生成真实文件">导出</button><button class="mini-btn" data-action="show-toast" data-message="已复制模拟链接（演示）">分享</button></div></div><div id="resultArea" class="result-empty"><div><div class="empty-icon">✦</div><h3>等待生成模拟结果</h3><p>设置左侧条件后点击按钮<br />这里会出现假数据与示例内容。</p></div></div></section>
    </div>`;
}

function resultFor(id) {
  if (id === 'esg') return `<div class="result-data"><div class="result-summary"><div class="metric"><span>样本企业</span><strong>12</strong></div><div class="metric"><span>平均披露率</span><strong>78%</strong></div><div class="metric"><span>本企业差距项</span><strong>6 <em>需关注</em></strong></div></div><table class="fake-table"><thead><tr><th>重点议题</th><th>同业披露率</th><th>模拟表现</th><th>建议</th></tr></thead><tbody><tr><td>范围三碳排放</td><td><span class="bar"><i style="width:82%"></i></span>82%</td><td>部分披露</td><td>补充核算边界</td></tr><tr><td>供应商 ESG 审核</td><td><span class="bar"><i style="width:68%"></i></span>68%</td><td>未披露</td><td>建立量化指标</td></tr><tr><td>气候情景分析</td><td><span class="bar"><i style="width:57%"></i></span>57%</td><td>定性描述</td><td>增加情景参数</td></tr></tbody></table><div class="hint">以上企业、数字和建议均为虚构演示，不构成真实对标结论。</div></div>`;
  if (id === 'research') return `<div class="result-data research-result"><div class="result-summary"><div class="metric"><span>产业链环节</span><strong>5</strong></div><div class="metric"><span>模拟资料</span><strong>36</strong></div><div class="metric"><span>趋势信号</span><strong>8</strong></div></div><h3>新型储能产业链快照</h3><p>示例研究将产业链拆分为上游材料、电芯与系统集成、能量管理、项目开发及运营服务。当前演示结果用于说明未来的信息呈现方式。</p><h3>模拟关键发现</h3><ul><li>系统安全与全生命周期成本成为竞争重点。</li><li>工商业储能的收益模型更强调精细化运营。</li><li>海外市场认证与本地服务能力可能影响扩张节奏。</li></ul><span class="citation-pill">模拟来源 A</span><span class="citation-pill">模拟来源 B</span><span class="citation-pill">模拟来源 C</span></div>`;
  if (id === 'word') return `<div class="result-data research-result"><div class="result-summary"><div class="metric"><span>识别段落</span><strong>42</strong></div><div class="metric"><span>标题层级</span><strong>4</strong></div><div class="metric"><span>格式提示</span><strong>7</strong></div></div><h3>公司标准研究报告（预览）</h3><p><b>1. 项目背景</b><br>已模拟统一正文样式、编号规则和段落间距。</p><p><b>2. 核心发现</b><br>此区域将展示转换后的报告内容和待人工确认项。</p><div class="hint">此预览没有读取所选文件，也不会生成可下载的 Word 文档。</div></div>`;
  if (id === 'ppt') return `<div class="result-data research-result"><div class="result-summary"><div class="metric"><span>建议页数</span><strong>12</strong></div><div class="metric"><span>章节</span><strong>4</strong></div><div class="metric"><span>图表建议</span><strong>6</strong></div></div><h3>模拟页面结构</h3><table class="fake-table"><tr><td>01</td><td>管理层摘要</td><td>关键判断 + 三项优先行动</td></tr><tr><td>02</td><td>现状与差距</td><td>基线、政策与利益相关方诉求</td></tr><tr><td>03</td><td>建设路线图</td><td>近期 / 中期 / 远期里程碑</td></tr><tr><td>04</td><td>保障机制</td><td>治理、资金、数据与能力</td></tr></table></div>`;
  if (id === 'assistant') return `<div class="result-data research-result"><h3>供应链尽责管理分析框架（模拟回答）</h3><p>建议从治理责任、风险识别、供应商准入、持续监测、纠正与补救、信息披露六个模块展开。每个模块均需明确制度、流程、量化指标及责任人。</p><h3>建议追问</h3><span class="citation-pill">如何设计供应商分级？</span><span class="citation-pill">哪些指标适合季度跟踪？</span><span class="citation-pill">如何验证整改闭环？</span><div class="hint">回答为预设静态文本，未连接真实 AI 或内部知识库。</div></div>`;
  return `<div class="result-data"><div class="result-summary"><div class="metric"><span>项目成员</span><strong>6</strong></div><div class="metric"><span>已确认记忆</span><strong>18</strong></div><div class="metric"><span>待复核</span><strong>3</strong></div></div><div class="project-board"><div class="project-col"><h3>待处理</h3><div class="task-tile">确认行业术语表<small>负责人：周岚</small></div></div><div class="project-col"><h3>进行中</h3><div class="task-tile">复核核心议题边界<small>仅项目组可见</small></div></div><div class="project-col"><h3>已确认</h3><div class="task-tile">报告语气与写作规范<small>版本：v1.2（演示）</small></div></div></div><div class="hint">正式版应按员工、项目和数据密级进行权限控制；AI 只检索用户有权访问的内容。</div></div>`;
}

function openModal(title, body) {
  modalRoot.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-head"><h2>${title}</h2><button class="close-btn" type="button" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body">${body}</div></section>`;
  modalRoot.classList.add('open');
  modalRoot.querySelector('.close-btn').focus();
}

function openDataFlow() {
  openModal('正式版：文件流向与存储说明', `<p>正式系统中，文件通常按照以下路径流转。具体保留时间、加密方式与访问权限需在开发阶段单独确定。</p><div class="flow"><div class="flow-step"><b>1</b>浏览器<br>选择本机文件</div><div class="flow-step"><b>2</b>后端鉴权<br>申请上传权限</div><div class="flow-step"><b>3</b>私有 OSS<br>加密对象存储</div><div class="flow-step"><b>4</b>任务服务<br>按权限处理</div><div class="flow-step"><b>5</b>下载到<br>用户本机</div></div><div class="notice"><b>OSS 是对象存储，不是服务器“内存”。</b><br>它适合保存上传文件和生成结果；处理中的临时文件可短期放在服务器磁盘或私有 OSS，并设置自动清理规则。</div><h3>原型阶段的安全边界</h3><ul><li>本页面不会把选择的文件发送到任何服务器。</li><li>不要上传真实客户资料、个人信息或保密文件。</li><li>不要把 API Key 写进网页代码或提交到 GitHub。</li><li>正式版需配置登录、细粒度权限、访问日志、传输加密和文件生命周期。</li></ul>`);
}

function openAdmin() {
  openModal('权限与费用 · 视觉入口', `<div class="admin-stats"><div class="admin-stat"><span>模拟成员数</span><strong>20</strong></div><div class="admin-stat"><span>本月模拟任务</span><strong>128</strong></div><div class="admin-stat"><span>模拟成本</span><strong>¥ 86.40</strong></div></div><h3>权限概览</h3><table class="fake-table"><tr><th>角色</th><th>可用工具</th><th>项目数据</th></tr><tr><td>管理员</td><td>全部</td><td>按授权范围</td></tr><tr><td>项目成员</td><td>已开通工具</td><td>所属项目</td></tr><tr><td>访客</td><td>演示工具</td><td>不可访问</td></tr></table><div class="hint">这里仅展示未来管理后台的可能结构，没有真实用户、账单或权限数据。</div>`);
}

function showToast(message) {
  clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

document.addEventListener('click', event => {
  const routeTarget = event.target.closest('[data-route]');
  if (routeTarget) location.hash = `#/${routeTarget.dataset.route}`;
  const actionTarget = event.target.closest('[data-action]');
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === 'show-toast') showToast(actionTarget.dataset.message);
    if (action === 'open-data-flow') openDataFlow();
    if (action === 'open-admin') openAdmin();
    if (action === 'close-modal') modalRoot.classList.remove('open');
    if (action === 'focus-search') { location.hash = '#/home'; setTimeout(() => document.querySelector('#toolSearch')?.focus(), 50); }
    if (action === 'toggle-menu') document.querySelector('.sidebar').classList.toggle('open');
    if (action === 'open-guide') openModal('原型使用说明', '<p>点击任意工具卡片进入模拟工作台；填写条件或选择本机文件后，点击生成按钮查看固定的假数据结果。</p><div class="notice">所有交互都在当前浏览器页面内完成。刷新后输入会消失，不会传到网络，也不会产生真实费用。</div>');
  }
  const runTarget = event.target.closest('[data-run-tool]');
  if (runTarget) {
    runTarget.textContent = '正在生成演示…'; runTarget.disabled = true;
    setTimeout(() => { const area = document.querySelector('#resultArea'); area.className = ''; area.innerHTML = resultFor(runTarget.dataset.runTool); runTarget.textContent = configs[runTarget.dataset.runTool].action; runTarget.disabled = false; }, 650);
  }
});

document.addEventListener('change', event => {
  if (event.target.matches('[data-fake-upload]')) {
    const file = event.target.files[0];
    if (file) { const zone = event.target.closest('.upload-zone'); zone.querySelector('strong').textContent = file.name; zone.querySelector('span:last-child').textContent = '仅显示文件名 · 文件未上传'; showToast('已选择文件，但不会上传或读取'); }
  }
});

modalRoot.addEventListener('click', event => { if (event.target === modalRoot) modalRoot.classList.remove('open'); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') modalRoot.classList.remove('open'); });
window.addEventListener('hashchange', route);
route();
