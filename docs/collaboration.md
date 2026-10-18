# 协作与同步：统一提交到别人能看到的地方

> 2026-10-18。今天出现过一次「美术看不到」：两个 agent 各用一个 worktree、各在自己的分支上，
> 美术那边落后 102 个提交，`docs/art/npcs.md` 根本不在她的树里。
> 以后按下面这条规则走。

## 1. 唯一真源：`origin/main`

- **任何人的提交，最终都要落到 `origin/main`**。别人看不到的提交，等于没提交。
- 本地 `main` 只是 `origin/main` 的镜像，谁都不长期在 `main` 上直接干活。

## 2. 两个工作区各干什么

| 工作区 | 分支 | 谁 | 干什么 |
|---|---|---|---|
| `D:\gpt\rea` | `codex/art-cloud-handoff` | 小克（代码） | 玩法、系统、文档 |
| `D:\gpt\rea-artwork` | `codex/local-seasonal-artwork` | 美术 | 画图、交付、美术文档 |

**不要在对方的工作区里改文件。** 今天发生过两边同时写 `D:\gpt\rea`、`public/game.css` 被抢改的情况。

## 3. 交完就同步（两条命令的事）

**小克（代码侧）每次提交后：**

```powershell
node scripts/push-main.mjs            # 提交推到 origin/main，带代理和重试
node scripts/sync-art.mjs             # 再把 origin/main 合进美术工作区
```

**美术（美术侧）每次开工前、收工后：**

```powershell
cd D:\gpt\rea-artwork
git add -A; git commit -m "WIP: art pass"    # 先把自己的改动手上落地
git fetch origin
git merge origin/main
git push -u origin codex/local-seasonal-artwork
```

或者直接让小克跑 `node scripts/sync-art.mjs`（它包含 fetch + merge + push）。
**前提是美术那边没有未提交改动**——有的话脚本会停下来列出来，不会替你丢东西。

## 4. 两条硬规矩

1. **提交前先同步**：`git fetch origin && git merge origin/main`，不要在自己的分支上连堆十几条再合。
2. **冲突优先救对方**：`public/game-shell.js`、`public/game.css`、`docs/art/prompts.md` 是两边都会改的，
   撞了以「谁的改动新」为准，但两边的内容都要保留。

## 5. 分支命名与推送

- 美术分支第一次要先 `git push -u origin codex/local-seasonal-artwork`，否则远端根本没有这条分支（今天就是这样）。
- 之后每次同步都会自动推。

## 6. 脚本

| 脚本 | 作用 |
|---|---|
| `scripts/push-main.mjs` | 把当前 HEAD 推到 `origin/main`，带代理与 3 次重试 |
| `scripts/sync-art.mjs` | 把 `origin/main` 合进美术工作区并推回；有未提交改动就停下 |
