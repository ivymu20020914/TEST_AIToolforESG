const projectDemoData = [
  { id: 'P01', name: 'ESG 报告项目（演示）', type: '报告与咨询', status: '进行中', theme: '年度信息收集、撰写与审核', date: '2027-05-30', tasks: 48, completed: 19, overdue: 3, milestones: '2 / 6' },
  { id: 'P02', name: '供应链调研项目（演示）', type: '研究项目', status: '进行中', theme: '供应商数据收集与风险分析', date: '2027-03-20', tasks: 31, completed: 22, overdue: 1, milestones: '4 / 5' },
  { id: 'P03', name: '可持续发展活动（演示）', type: '活动项目', status: '规划中', theme: '议程、嘉宾、传播与现场执行', date: '2027-08-18', tasks: 64, completed: 8, overdue: 0, milestones: '1 / 8' }
];

const projectDemoTasks = [
  ['T-014', '确认报告边界与议题', '项目启动', '周岚', '进行中', '2027-01-26', '高'],
  ['T-021', '下发指标收集表', '数据收集', '陈晨', '待开始', '2027-02-03', '高'],
  ['T-028', '汇总各部门反馈', '数据收集', '许宁', '待开始', '2027-02-18', '中'],
  ['T-036', '完成初稿内部审核', '报告编制', '周岚', '待开始', '2027-04-12', '高'],
  ['T-041', '客户意见闭环', '报告编制', '陈晨', '待开始', '2027-05-08', '中']
];

function renderProjectManagementWorkspace() {
  document.querySelector('#pageCrumb').textContent = '项目管理';
  app.innerHTML = `<section class="page project-management-page">
    <button class="back-link" type="button" data-route="home">← 返回工具中心</button>
    <div class="workspace-hero"><div class="workspace-title"><span class="tool-icon">◇</span><div><h1>项目管理</h1><span class="workspace-title-en">PROJECT MANAGEMENT</span><p>集中查看项目、任务、关键节点、成员分工和可复用模板。</p></div></div><span class="prototype-tag">开发中 · 脱敏演示</span></div>
    <div class="project-dev-notice"><strong>开发边界</strong><span>当前页面使用虚构数据展示规划中的界面和流程，不保存修改，也未连接内部项目、成员、附件、费用或权限数据。</span></div>
    <div class="project-tabs" role="tablist" aria-label="项目管理视图">
      <button class="active" type="button" data-project-tab="portfolio">项目组合</button>
      <button type="button" data-project-tab="tasks">任务中心</button>
      <button type="button" data-project-tab="templates">项目模板</button>
    </div>
    <div id="projectManagementContent"></div>
  </section>`;
  document.querySelectorAll('[data-project-tab]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-project-tab]').forEach(item => item.classList.toggle('active', item === button));
    renderProjectManagementTab(button.dataset.projectTab);
  }));
  renderProjectManagementTab('portfolio');
}

function renderProjectManagementTab(tab) {
  const root = document.querySelector('#projectManagementContent');
  if (tab === 'portfolio') root.innerHTML = renderProjectPortfolio();
  else if (tab === 'tasks') root.innerHTML = renderProjectTasks();
  else root.innerHTML = renderProjectTemplates();
  root.querySelectorAll('[data-project-demo]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.projectDemo)));
  const search = root.querySelector('#projectDemoSearch');
  if (search) search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    root.querySelectorAll('[data-project-card]').forEach(card => { card.hidden = !card.textContent.toLowerCase().includes(query); });
  });
}

function renderProjectPortfolio() {
  const totals = projectDemoData.reduce((sum, item) => ({ tasks: sum.tasks + item.tasks, completed: sum.completed + item.completed, overdue: sum.overdue + item.overdue }), { tasks: 0, completed: 0, overdue: 0 });
  return `<section class="project-demo-section"><div class="project-section-head"><div><span>01 · PROJECT PORTFOLIO</span><h2>项目组合</h2><p>按项目隔离任务、节点、成员和资料，汇总仅显示有权限的数据。</p></div><button class="run-btn" type="button" data-project-demo="创建项目功能仍在开发中">创建项目</button></div>
    <div class="project-kpis"><div><span>项目</span><b>${projectDemoData.length}</b></div><div><span>任务</span><b>${totals.tasks}</b></div><div><span>已完成</span><b>${totals.completed}</b></div><div><span>逾期</span><b class="project-risk">${totals.overdue}</b></div></div>
    <label class="project-search"><span>搜索项目</span><input id="projectDemoSearch" type="search" placeholder="输入项目名称、主题或类型"></label>
    <div class="project-card-grid">${projectDemoData.map((item, index) => `<article class="project-card" data-project-card><div class="project-card-label">${item.type} · ${item.status}</div><h3>${item.name}</h3><p>${item.theme}</p><div class="project-date">目标日期 ${item.date}</div><div class="project-card-stats"><span>任务 <b>${item.tasks}</b></span><span>已完成 <b>${item.completed}</b></span><span>逾期 <b class="project-risk">${item.overdue}</b></span><span>节点 <b>${item.milestones}</b></span></div><div class="project-card-actions"><button type="button" data-project-demo="项目详情功能仍在开发中">查看项目</button><button type="button" data-project-demo="成员与权限功能仍在开发中">成员与权限</button></div></article>`).join('')}</div></section>`;
}

function renderProjectTasks() {
  return `<section class="project-demo-section"><div class="project-section-head"><div><span>02 · TASK CENTER</span><h2>任务中心</h2><p>统一管理阶段、负责人、截止日期、优先级、状态和交付物。</p></div><button class="run-btn" type="button" data-project-demo="新增任务功能仍在开发中">新增任务</button></div>
    <div class="project-filter-row"><select aria-label="任务项目"><option>ESG 报告项目（演示）</option></select><select aria-label="任务状态"><option>全部状态</option><option>待开始</option><option>进行中</option><option>待审核</option><option>已完成</option></select><input type="search" placeholder="搜索任务、负责人或阶段"></div>
    <div class="project-task-wrap"><table class="project-task-table"><thead><tr><th>编号</th><th>任务</th><th>阶段</th><th>负责人</th><th>状态</th><th>截止日期</th><th>优先级</th></tr></thead><tbody>${projectDemoTasks.map(task => `<tr><td>${task[0]}</td><td><button data-project-demo="任务详情与协作功能仍在开发中">${task[1]}</button></td><td>${task[2]}</td><td>${task[3]}</td><td><span class="project-status">${task[4]}</span></td><td>${task[5]}</td><td>${task[6]}</td></tr>`).join('')}</tbody></table></div>
    <div class="project-roadmap"><h3>关键节点</h3><div><span class="done"><i></i><b>项目启动</b><small>已完成</small></span><span class="current"><i></i><b>指标下发</b><small>进行中</small></span><span><i></i><b>资料收齐</b><small>2027-02-28</small></span><span><i></i><b>初稿完成</b><small>2027-04-12</small></span><span><i></i><b>项目交付</b><small>2027-05-30</small></span></div></div></section>`;
}

function renderProjectTemplates() {
  const templates = [['ESG 报告项目','报告与咨询','启动、收资、编制、审核与交付'],['研究项目','行业与专题研究','框架、资料、访谈、分析与交付'],['活动项目','论坛、沙龙与发布会','策划、嘉宾、传播、现场与复盘'],['培训项目','内部或客户培训','需求、课程、讲师、实施与评估']];
  return `<section class="project-demo-section"><div class="project-section-head"><div><span>03 · PROJECT TEMPLATES</span><h2>项目模板</h2><p>复用经过验证的阶段、任务和字段，不复制成员授权或项目敏感资料。</p></div></div><div class="project-template-grid">${templates.map(item => `<article class="project-template-card"><span>标准模板 · ${item[1]}</span><h3>${item[0]}</h3><p>${item[2]}</p><button type="button" data-project-demo="使用模板创建项目功能仍在开发中">查看模板</button></article>`).join('')}</div></section>`;
}
