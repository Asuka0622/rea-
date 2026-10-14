import { guessMeaning } from './replicate-spec.js';

// Presentation only: derive the reading guide from evidence in the existing report.
// Names suggest meaning; they never prove a working feature or a runtime outcome.
export function beginnerReading(report = {}, command = '') {
  const sections = report.sections || [];
  const section = (title) => sections.find(item => item.title === title);
  const fact = (label) => String(report.facts?.find(item => item.label === label)?.value ?? '未提供');
  const clip = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const namedClues = rows => rows.slice(0, 5).map(row => {
    const evidence = clip(row[0]);
    const meaning = guessMeaning(evidence);
    return { label: meaning || '暂时无法从名字判断用途', evidence };
  });
  const result = {
    title: '文件分析报告',
    finding: '这份报告记录了本次读取到的文件信息。仅靠文件结构，还不能确定软件的完整功能。',
    clues: [],
    structure: '下面的专业细节保留了原始发现。先看有中文说明的部分，再按需要查看文件和代码位置。',
    learn: '先挑一条自己能解释的发现，弄清它的作用；暂时不理解时，可以让 AI 用大白话解释报告。',
  };
  if (command === 'analyze-javascript-application' || report.title === 'JavaScript 应用分析') {
    const channels = section('主进程提供的功能（IPC 通道）')?.table?.rows || [];
    result.title = '软件结构报告';
    result.clues = namedClues(channels);
    result.finding = channels.length
      ? `代码里找到 ${channels.length} 个“界面请后台办事”的入口。下面根据入口名称推测用途，实际行为还要结合代码确认。`
      : '这次找到了代码结构，但没有找到可展示的界面功能入口，暂时不能判断它具体能做什么。';
    result.structure = channels.length
      ? (section('暴露给界面的接口')
        ? '可以这样理解已找到的分工：界面接收你的操作 → 连接层把请求交给后台 → 后台处理 → 把结果返回界面。通道名就是双方约好的“要办哪件事”。'
        : '已找到界面请求后台办事的入口。后台处理请求，再把结果交回界面；这些入口的名字帮助我们定位对应代码。')
      : '代码文件组成程序；它们会使用其他文件或现成工具。下面的文件和依赖列表能帮助定位各部分，不能单独证明某个功能已实现。';
    const known = result.clues.find(item => item.label.startsWith('可能是：'));
    result.learn = known
      ? `可以先选“${known.label.replace('可能是：', '')}”这条线索，阅读对应代码、确认用途，再用自己的代码做一个最小练习。`
      : '先了解代码文件各自负责什么。等找到并确认一个具体功能，再开始动手练习。';
  } else if (command === 'inspect-unity-bundle') {
    result.title = 'Unity 资源实测报告';
    result.finding = `真实读取了 Unity 资源包，导出 ${fact('导出贴图')} 张贴图、${fact('导出 OBJ')} 个 OBJ 网格，并记录 ${fact('资源参数')} 项资源参数。具体参数值在下方专业细节中。`;
    result.structure = '资源包中可能包含贴图、精灵和网格。每个参数都记录资源文件、对象 ID 和字段来源；已导出的 PNG 和 OBJ 可在项目 exports/unity 目录查看。';
    result.learn = Number(fact('导出 OBJ')) > 0 ? '先用模型工具打开 OBJ，再核对报告中的顶点和三角形数量。OBJ 是几何网格，不包含骨骼、动画或材质连接，不保证能直接替换人物；资源参数不等于生命值等游戏行为。' : '先查看导出的贴图，再核对宽度、高度与原始字段。未导出 OBJ 时，请结合对象清单和未完成项判断；资源参数不等于生命值、天气算法或完整游戏逻辑。';
  } else if (command === 'inspect-rust-project' || report.title === 'Rust 源码结构') {
    result.title = '源码项目报告';
    const rows = section('模块与源码位置')?.table?.rows || [];
    result.finding = '这是一份源码项目的结构清单。模块相当于分工不同的零件；仅凭模块名，不能确定软件的全部功能。';
    result.clues = namedClues(rows);
    result.structure = '各模块存放自己的代码，依赖清单记录它们声明要使用的现成工具。本次没有编译或运行软件，也没有验证全部依赖能否安装。';
    result.learn = '先挑一个能理解的模块，从它的源码位置开始读。弄清一项具体功能后，再尝试做一个简化版。';
  } else if (command === 'inspect-model-mod' || report.title === '人物模型 Mod · 文件与资源') {
    result.title = '模型与贴图文件检查';
    result.finding = `本次只检查文件和配置的连接：${fact('未找到的引用')} 处静态引用未找到。模型或贴图存在，也不代表它能在游戏里正确显示。`;
    result.structure = '配置文件负责指向资源，模型文件记录形状，贴图文件记录外观。本次没有读取完整模型形状、检查骨骼适配或运行游戏。';
    result.learn = '先展开资源引用检查，核对未找到的文件；动态或目录外引用需要另行确认。制作步骤和工具请看首页底部的“兴趣拓展 · 人物模型 Mod”指南。';
  } else if (command === 'inspect-game-source') {
    result.title = report.title || '游戏与 Mod 源码报告';
    result.finding = `这是“${fact('案例类型')}”的本地源码阅读结果。可以用它寻找学习入口，本次没有运行游戏或验证修改效果。`;
    result.clues = (section('从这些源码开始')?.table?.rows || []).filter(row => row[2] === '已找到').slice(0, 5)
      .map(row => ({ label: clip(row[1]), evidence: clip(row[0]) }));
    result.structure = '入口文件决定从哪里开始；其他脚本和资源负责具体行为。数值线索标出代码位置，不等于完整执行流程。';
    result.learn = '先读上面一项学习入口，弄清一个属性或行为由哪里控制；修改前查看案例说明里的工具、版本和验证方法。';
  } else if (command === 'compare-javascript-versions' || report.title === '版本对比') {
    const changes = sections.filter(item => /^(新增|去掉) · /.test(item.title));
    result.title = '版本对比报告';
    result.finding = report.headline || '这次对比了同一个软件的两个版本。';
    result.clues = changes.slice(0, 5).map(item => ({ label: item.title, evidence: clip((item.table?.rows || item.items || []).map(row => Array.isArray(row) ? row[0] : row).join('、')) }));
    result.structure = '先看开发者自己写的「更新说明」，再看下面每一组「新增」和「去掉」。说明里没提、代码里却变了的地方，最值得留意。';
    result.learn = '挑一项新增的变化，回到新版本的代码里找到它，弄清它做了什么、为什么更新说明里没写。';
  } else if (command === 'inspect-android-package') {
    result.title = '手机 App 结构报告';
    result.finding = '这次读取了 App 的组件、权限和开发框架线索。申请某项权限不等于实际使用过它，也不能据此判断 App 的完整用途。';
    result.clues = namedClues(section('App 自己写的组件')?.table?.rows || []);
    result.structure = '页面负责显示和交互，后台组件处理任务，现成库提供可复用的能力。组件是否实际承担这些工作，需要继续结合代码确认。';
    result.learn = '先看“App 自己写的组件”的中文说明，再查看权限和现成能力。挑一个已确认的功能作为学习目标。';
  }
  return result;
}
