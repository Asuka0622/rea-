# NPC 8 帧四方向行走候选 · Batch B

本目录只用于动画审阅。候选没有接入 `public/art/pixel/`，也没有任何方向通过严格验收；当前没有可交付给运行时的通过版方向条。

## 验收标准

每个方向需满足：第 1 帧与第 5 帧由相反腿领步，手臂随腿自然反向摆动；步幅从 A 收拢、换重心后在第 5 帧以 B 腿重新迈大；角色不能滑行。左右侧脸方向要分别正确，随身道具需固定在原手且形状稳定。图集还需没有越格、切边或相邻帧残片。

| 角色 | 下 | 上 | 左 | 右 | 当前结论 |
|---|---|---|---|---|---|
| lighthouse-keeper | 拒收：1/5 领步腿和反摆差异不够明确 | 拒收：未能确认腿与手臂同步换相 | 拒收：朝向正确、灯笼稳定，但 1/5 步态相位不合格 | 拒收：朝向正确、灯笼稳定，但 1/5 步态相位不合格 | v3 独立方向条仍未通过步态验收 |
| oncall | 拒收：独立条中第 1/5 帧反摆不清；图集有切边残片 | 拒收：独立条中第 1/5 帧反摆不清；图集有切边残片 | 拒收：图集拼接有行/格污染 | 拒收：图集拼接有行/格污染 | v1/v2 图集不合格；侧向无干净独立条 |
| paperboy | 拒收：图集中身体和脚被切开 | 拒收：图集中身体和脚被切开 | 拒收：虽朝左，仍有切边/残片且步态相位不合格 | 拒收：虽朝右，仍有切边/残片且步态相位不合格 | v1/v2 图集不合格 |
| parcel | 拒收：1/5 近似重复姿势，腿与手臂没有清楚交换 | 拒收：1/5 近似重复姿势，腿与手臂没有清楚交换 | 拒收：朝向正确，但 1/5 领步腿与手臂近似重复 | 拒收：朝向正确，但 1/5 领步腿与手臂近似重复 | v2 图集不合格 |

## 逐角色审阅图

- **lighthouse-keeper**：[v3 图集候选](lighthouse-keeper/sprite-lighthouse-keeper-walk-8f-v3-candidate.png) · [物理尺寸 contact sheet](lighthouse-keeper/lighthouse-keeper-walk-8f-v3-physical-contact.png) · [第 1/5 帧对照](lighthouse-keeper/lighthouse-keeper-phase-f1-vs-f5-v3.png) · [JSON 验收记录](lighthouse-keeper/sprite-lighthouse-keeper-walk-8f-v3-candidate.json)。灯笼在固定手上且稳定；左右脸朝向分别正确。腿和手臂没有达到明确的 A/B 反相步态，所以四向都拒收。
- **oncall**：[v2 图集候选](oncall/sprite-oncall-walk-8f-v2-candidate.png) · [图集 contact sheet](oncall/oncall-walk-8f-v2-physical-contact.png) · [独立下/上方向条对照](oncall/oncall-down-up-physical-contact-v1.png) · [JSON 验收记录](oncall/sprite-oncall-walk-8f-v2-candidate.json)。电话、牵引绳保持原有手持设定，但当前帧中手臂没有清楚随领步腿交换；侧向行仍有拼格残片。
- **paperboy**：[v2 图集候选](paperboy/sprite-paperboy-walk-8f-v2-candidate.png) · [图集 contact sheet](paperboy/paperboy-walk-8f-v2-physical-contact.png) · [JSON 验收记录](paperboy/sprite-paperboy-walk-8f-v2-candidate.json)。帽子、红外套、挎包和卷纸外观保留；切边/格间残片和不清楚的 1/5 步态使四向拒收。
- **parcel**：[v2 图集候选](parcel/sprite-parcel-walk-8f-v2-candidate.png) · [物理尺寸 contact sheet](parcel/parcel-walk-8f-v2-physical-contact.png) · [第 1/5 帧对照](parcel/parcel-phase-f1-vs-f5-v2.png) · [JSON 验收记录](parcel/sprite-parcel-walk-8f-v2-candidate.json)。左右朝向正确，腰间扫描器稳定；但第 1/5 帧基本重复，未形成换腿和同步反摆。

## 版本与限制

- `v1`/`v2` 整图生成候选用于定位问题，不作为可接入素材。各 JSON 的 `batchReview.directions` 都逐向记录为 `rejected`。
- lighthouse-keeper 的 v3 由独立方向条拼装，解决了部分格间污染；动画相位仍未通过。没有把“朝向正确”误标成“方向通过”。
- 图像生成达到服务使用限制后，oncall 只得到下/上独立条；paperboy 没有独立条。其余候选仅保留已生成的审阅文件，没有继续重跑整图。
- 新一轮应只重做被拒方向，并在合成整张 atlas 前先逐张检查第 1/5 帧和透明边距。
