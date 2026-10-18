const key=(x,y)=>`${x},${y}`;
const clone=x=>JSON.parse(JSON.stringify(x));
export function rotatePorts(dirs){return [dirs[3],dirs[0],dirs[1],dirs[2]];}
// 2026-10-18（小克）：棋盘的意思改成「阿哲的软件怎么发布」——每关一种真实的钥匙（names），试运行后再用 REA 把发布包拆开扫一遍（scanPackages）。
// 地形和参考解没动，原来的关卡设计和规则引擎都是另一个会话做的。
function level({id,title,lesson,size,paths,sources,exits,gates=[],filters=[],fixed=[],overrides={},walls=[],tips,decoys=false,checkpoints=[],openValves=[],names={},takeaway=''}){
 const cells=new Map(),get=(x,y)=>{const k=key(x,y);if(!cells.has(k))cells.set(k,{x,y,dirs:[0,0,0,0],type:'pipe',fixed:false});return cells.get(k);};
 for(const path of paths)for(let i=1;i<path.length;i++){const [a,b]=[path[i-1],path[i]],dx=b[0]-a[0],dy=b[1]-a[1],dir=dx===1?1:dx===-1?3:dy===1?2:0;get(...a).dirs[dir]=1;get(...b).dirs[(dir+2)%4]=1;}
 for(const s of sources){const t=get(...s.at);t.type='source';t.fixed=true;t.packet=s.packet;}
 for(const e of exits){const t=get(...e.at);t.type='exit';t.fixed=true;}
 for(const [k,dirs]of Object.entries(overrides))cells.get(k).dirs=dirs;
 for(const at of fixed)get(...at).fixed=true;
 for(const at of gates)Object.assign(get(...at),{type:'valve',fixed:true,open:false,role:'leak'});
 for(const at of filters)Object.assign(get(...at),{type:'filter',fixed:true,allow:'public'});
 for(const at of openValves)Object.assign(get(...at),{type:'valve',fixed:true,open:true,role:'business'});
 for(const at of checkpoints)Object.assign(get(...at),{type:'checkpoint'});
 if(decoys)for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(cells.has(key(x,y))||walls.some(p=>p[0]===x&&p[1]===y))continue;const t=get(x,y);t.decoy=true;t.dirs=[[1,1,0,0],[0,1,0,1],[1,1,1,0]][(x*3+y*7)%3].slice();}
 const solution=[...cells.values()].map(clone),tiles=solution.map((t,i)=>{t=clone(t);if(t.type==='valve')t.open=!t.open;else if(t.type==='filter')t.allow='both';else if(!t.fixed&&!t.decoy){const original=t.dirs.join('');for(let n=0;n<i%3+1;n++)t.dirs=rotatePorts(t.dirs);if(t.dirs.join('')===original)t.dirs=rotatePorts(t.dirs);}return t;});
 let parMoves=0;for(const target of solution){let t=clone(tiles.find(v=>v.x===target.x&&v.y===target.y));if(t.type==='valve'){parMoves+=t.open!==target.open?1:0;}else if(t.type==='filter'){parMoves+=1;}else if(!t.fixed){for(let i=0;i<4&&t.dirs.join('')!==target.dirs.join('');i++){parMoves++;t.dirs=rotatePorts(t.dirs);}}}
 return {id,title,lesson,size,sources,exits,walls,tips,tiles,solution,parMoves,names:{secret:'密钥',public:'公开素材',server:'服务器',package:'发布包',valve:'阀门',filter:'过滤器',checkpoint:'校验节点',wall:'封闭机柜',...names},takeaway};
}
const source=(packet,at,target)=>({id:packet,packet,at,target}),exit=(kind,at)=>({kind,at});
export const PIPE_LEVELS=[
 level({id:'first-link',title:'天气接口密钥该去哪',lesson:'阿哲把天气接口密钥写进了软件里。软件一发出去，谁都能拆开看到它。把密钥接到服务器：服务器替你保管、替你去调天气接口，软件里就不用放密钥了。',size:4,paths:[[[0,2],[1,2],[2,2],[2,1],[3,1]]],sources:[source('secret',[0,2],[3,1])],exits:[exit('server',[3,1])],tips:['左边是写在代码里的密钥，右边是你自己的服务器。','从密钥往右看，哪一格的开口没对上？','白色锁定的端点不能转；其他管道每点一次转 90°。'],names:{secret:'天气接口密钥'},takeaway:'密钥留在服务器上，软件只请求你自己的服务器，由服务器带着密钥去调天气接口。'}),
 level({id:'detour',title:'数据库只能从服务器连',lesson:'代码里还有一条数据库连接地址，拿到它就能直接登录用户数据库。中间是防火墙机柜，绕过去，把它接到服务器上。',size:5,paths:[[[0,4],[1,4],[1,3],[1,2],[2,2],[3,2],[3,1],[3,0],[4,0]]],sources:[source('secret',[0,4],[4,0])],exits:[exit('server',[4,0])],walls:[[2,3],[2,1],[0,1]],tips:['灰色的是防火墙机柜，管道不能穿过去。','从下面的起点先往右，再往上。','中间那段横管要接到右上角的弯管，不是直穿机柜。'],names:{secret:'数据库连接',wall:'防火墙'},takeaway:'数据库只该从服务器连。软件要数据，就去问服务器的接口，而不是自己连数据库。'}),
 level({id:'wrong-exit',title:'管理员密码别进安装包',lesson:'通了不等于安全。上面是服务器的密码保险箱，下面是要发给全校的安装包：管理员密码只能进保险箱，一点都不能流进安装包。',size:5,paths:[[[0,2],[1,2],[2,2],[2,1],[3,1],[4,1]],[[2,2],[2,3],[3,3],[4,3]]],sources:[source('secret',[0,2],[4,1])],exits:[exit('server',[4,1]),exit('package',[4,3])],overrides:{'2,2':[1,1,0,1]},tips:['上面是服务器，下面是安装包。两个出口意思完全不同。','看中间的三通：别让下面的支路连上密码。','允许有空着的开口，但不能有一条路通到红色的安装包。'],names:{secret:'管理员密码',server:'密码保险箱',package:'安装包'},takeaway:'管理员密码根本不该写在软件里。需要的话放在服务器的密码保险箱里，安装包里一个字都不留。'}),
 level({id:'valve',title:'发布前关掉调试日志',lesson:'开发时开着「调试日志」，会把每次请求连同密钥一起记下来，日志还会被打进安装包。两个业务开关要开着，调试日志那个必须关掉。',size:6,paths:[[[0,3],[1,3],[1,2],[2,2],[3,2],[3,1],[4,1],[4,0],[5,0]],[[2,2],[2,3],[3,3],[4,3],[5,3]]],sources:[source('secret',[0,3],[5,0])],exits:[exit('server',[5,0]),exit('package',[5,3])],gates:[[2,3]],openValves:[[1,2],[3,1]],fixed:[[2,2],[3,3],[4,3]],walls:[[0,0],[0,1],[5,5]],decoys:true,tips:['不是全开也不是全关。先认出哪个开关是调试日志。','试运行会亮出密钥实际走过的格子，不要只看管道的样子。','主路要一直通；没用的管道可以不接，但不能给密钥留一条通到安装包的岔路。'],names:{secret:'天气接口密钥',package:'安装包',valve:'开关',leakValve:'调试日志',businessValve:'业务通道'},takeaway:'发布前要关掉调试开关、清掉日志：很多泄漏不是写在代码里，而是被日志顺手记下来的。'}),
 level({id:'filter',title:'不是所有钥匙都要藏',lesson:'地图令牌和天气密钥不一样：它限定了只能在你的网站和软件里用，本来就要发给每个用户，可以进安装包。两个打包过滤器决定哪些东西进包：让地图令牌进去，把天气密钥挡在外面。',size:7,paths:[[[0,1],[1,1],[1,2],[2,2],[3,2],[3,1],[4,1],[5,1],[5,0],[6,0]],[[0,5],[1,5],[2,5],[2,4],[3,4],[4,4],[4,5],[5,5],[6,5]],[[3,2],[3,3],[3,4]],[[2,2],[2,3],[2,4]],[[5,1],[5,2],[6,2]]],sources:[source('secret',[0,1],[6,0]),source('public',[0,5],[6,5])],exits:[exit('server',[6,0]),exit('package',[6,5]),exit('package',[6,2])],filters:[[3,3],[2,3]],gates:[[5,2]],fixed:[[3,2],[3,4],[2,2],[2,4],[5,1]],walls:[[0,3],[1,3],[6,3]],decoys:true,tips:['先保证两条业务路都通：天气密钥到服务器，地图令牌到安装包。','两个过滤器各管一条混合支路，只改一个不一定安全。','上面那条旁路有自己的开关。可以有不同的安全解，不必和参考答案一样。'],names:{secret:'天气接口密钥',public:'地图令牌（限定域名）',package:'安装包',filter:'打包过滤器',leakValve:'旁路开关'},takeaway:'能公开的令牌要限定用途（只能在你的域名、你的软件里用）；真正的密钥一个都不能进包。分清这两种，比把所有东西都藏起来更重要。'}),
 level({id:'release-check',title:'发布前夜：每样东西都要过审',lesson:'最后一关：天气密钥和地图令牌都要发布，三个安装包出口，过滤器和开关都在。天气密钥到服务器前必须经过「密钥扫描」，地图令牌进包前必须经过「域名限制」，不能走捷径绕过去。',size:8,paths:[[[0,2],[1,2],[1,1],[2,1],[3,1],[3,0],[4,0],[5,0],[5,1],[6,1],[6,0],[7,0]],[[0,6],[1,6],[1,5],[2,5],[3,5],[3,6],[4,6],[5,6],[5,5],[6,5],[6,6],[7,6]],[[2,1],[2,2],[2,3],[2,4],[2,5]],[[5,1],[5,2],[6,2],[7,2]],[[3,5],[3,4],[4,4],[5,4],[6,4],[7,4]]],sources:[{...source('secret',[0,2],[7,0]),checkpoints:[[3,1]]},{...source('public',[0,6],[7,6]),checkpoints:[[5,6]]}],exits:[exit('server',[7,0]),exit('package',[7,6]),exit('package',[7,2]),exit('package',[7,4])],gates:[[6,2]],filters:[[2,3],[4,4]],checkpoints:[[3,1],[5,6]],fixed:[[2,1],[5,1],[2,5],[3,5],[3,4],[5,2]],walls:[[0,3],[1,3],[4,2],[4,3]],decoys:true,tips:['先看清每样东西的目的地。蓝色审查点必须挡在通往目的地的每一条路上。','试运行会指出泄漏或绕过审查的路。主路通了，不代表岔路也安全。','依次检查：两条业务路、三个红色出口、两个审查点。别为了安全把一切都关掉。'],names:{secret:'天气接口密钥',public:'地图令牌（限定域名）',package:'安装包',checkpoint:'审查点',leakValve:'旁路开关'},takeaway:'发布前的自查要像 REA 一样把安装包拆开看：该在服务器的在服务器，该公开的已经限定了用途，没有一条路能绕过检查。'})
];
export function initialBoard(spec){return clone(spec.tiles);}
export function applyPipeAction(board,x,y){const out=clone(board),t=out.find(t=>t.x===x&&t.y===y);if(!t)return out;if(t.type==='valve')t.open=!t.open;else if(t.type==='filter')t.allow={both:'public',public:'secret',secret:'both'}[t.allow]||'both';else if(!t.fixed)t.dirs=rotatePorts(t.dirs);return out;}
export function inspectPipeBoard(spec,board){
 const map=new Map(board.map(t=>[key(t.x,t.y),t]));
 const walk=(source,blocked=null)=>{const accepts=t=>t&&key(t.x,t.y)!==blocked&&!(t.type==='valve'&&!t.open)&&!(t.type==='filter'&&t.allow!=='both'&&t.allow!==source.packet);const seen=new Set(),queue=[source.at];while(queue.length){const [x,y]=queue.shift(),k=key(x,y),t=map.get(k);if(seen.has(k)||!accepts(t))continue;seen.add(k);for(const [i,dx,dy]of [[0,0,-1],[1,1,0],[2,0,1],[3,-1,0]]){const next=map.get(key(x+dx,y+dy));if(t.dirs[i]&&next?.dirs[(i+2)%4]&&accepts(next))queue.push([x+dx,y+dy]);}}return seen;};
 const flows=spec.sources.map(source=>{const seen=walk(source),targetReached=seen.has(key(...source.target)),bypassed=(source.checkpoints||[]).filter(p=>!seen.has(key(...p))||walk(source,key(...p)).has(key(...source.target)));return {id:source.id,packet:source.packet,visited:[...seen],targetReached,bypassed,leaks:source.packet==='secret'?spec.exits.filter(e=>e.kind==='package'&&seen.has(key(...e.at))).map(e=>e.at):[]};});
 const leaks=flows.flatMap(f=>f.leaks),missing=flows.filter(f=>!f.targetReached).map(f=>f.packet),bypasses=flows.flatMap(f=>f.bypassed.map(at=>({packet:f.packet,at})));return {flows,leaks,missing,bypasses,passed:!leaks.length&&!missing.length&&!bypasses.length};
}
export function campaignReady(records){return PIPE_LEVELS.every(l=>records[l.id]?.passed===true);}
export function restorePipeBoard(spec,value){if(!Array.isArray(value)||value.length!==spec.tiles.length)return null;const out=[];for(const source of spec.tiles){const t=value.find(t=>t.x===source.x&&t.y===source.y);if(!t)return null;const candidate=clone(source);if(source.type==='valve')candidate.open=typeof t.open==='boolean'?t.open:source.open;else if(source.type==='filter')candidate.allow=['both','public','secret'].includes(t.allow)?t.allow:source.allow;else if(!source.fixed){let dirs=source.dirs;let ok=false;for(let i=0;i<4;i++){if(JSON.stringify(dirs)===JSON.stringify(t.dirs)){candidate.dirs=clone(dirs);ok=true;break;}dirs=rotatePorts(dirs);}if(!ok)return null;}out.push(candidate);}return out;}

/**
 * REA 拆包扫描：把每个发布包（安装包）拆开，看试运行时流进去的都是什么。
 * 返回 [{at, found:[{packet,name,ok}]}]：密钥类（secret）进包就是泄漏；公开类（public）进包是对的。
 */
export function scanPackages(spec,result){
 const names=spec.names||{};
 return spec.exits.filter(e=>e.kind==='package').map(e=>{
  const k=`${e.at[0]},${e.at[1]}`;
  const found=result.flows.filter(f=>f.visited.includes(k)).map(f=>({packet:f.packet,name:names[f.packet]||f.packet,ok:f.packet!=='secret'}));
  return {at:e.at,found};
 });
}
