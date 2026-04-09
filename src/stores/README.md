# Pinia Store 一览

本文档按模块列出各 store 的职责与 **action**（含少量与全局 UI 强相关的同步方法），便于快速回顾「状态里在做什么」。

---

## `index.store.ts` — 根级全局 UI 与启动（6 个 action）

根 Store（`id: 'root'`）只保留登录/资料弹窗、资料编辑表单草稿、窗口尺寸等**真正的全局 UI 状态**；开发态通过 `acceptHMRUpdate` 支持热更新。

| action                | 注释                                                          |
| --------------------- | ------------------------------------------------------------- |
| `toggleLoginDialog`   | 切换登录弹窗显示/隐藏                                         |
| `toggleProfileDialog` | 切换个人资料弹窗显示/隐藏                                     |
| `setProfileEditForm`  | 写入资料编辑表单数据（`Partial<IUserInfo>`）                  |
| `getWindowInfo`       | 读取当前窗口宽高并监听 `resize`，用于响应式布局               |
| `checkAuthAction`     | 请求校验 Token 是否有效；401 视为未通过，网络异常时不强制登出 |
| `loadLoginAction`     | 从本地缓存恢复 `token` / `userInfo` 到 `user` store           |

**Getters（补充）**：`isSmallScreen` — 宽度非 0 且小于 1200 时视为小屏（宽度为 0 未初始化时按大屏处理）。

---

## `article.store.ts` — 文章业务状态（11 个 action）

| action                   | 注释                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| `initArticle`            | 重置当前文章详情和文章列表（路由离开时清理）                       |
| `refreshFirstPageAction` | 强制刷新第一页文章列表（发布/删除后调用）                          |
| `getArticleListAction`   | 分页获取文章列表，支持追加模式（无限滚动）和覆盖模式               |
| `getRecommendAction`     | 获取推荐文章列表（侧边栏展示）                                     |
| `getTagsAction`          | 获取全部文章标签（导航栏标签列表）                                 |
| `getDetailAction`        | 获取文章详情，附带浏览量+1、点赞状态、收藏夹、浏览记录等副作用     |
| `getUserLikedAction`     | 拉取当前登录用户已点赞的文章 ID 列表，供 `isArticleUserLiked` 判断 |
| `createAction`           | 发布新文章：创建文章 → 关联图片/视频/标签 → 清除草稿 → 跳转详情页  |
| `updateAction`           | 更新已有文章：修改标签 → 修改内容 → 重新关联图片/视频 → 返回上一页 |
| `removeAction`           | 删除指定文章并跳转回文章列表页                                     |
| `likeAction`             | 切换文章点赞状态，并同步更新列表和详情中的点赞数                   |

---

## `editor.store.ts` — 编辑器临时文件状态（7 个 action）

| action                      | 注释                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `setManualCoverImgId`       | 设置或清除手动上传的封面图片 ID                             |
| `addPendingImageId`         | 记录一张编辑器中新插入的图片 ID，用于发布失败时回收         |
| `addPendingVideoId`         | 记录一个编辑器中新上传的视频 ID（去重），用于发布失败时回收 |
| `clearPendingFiles`         | 一次性清空所有待清理文件状态（封面 + 图片 + 视频）          |
| `uploadCoverAction`         | 上传封面图片并自动记录其 ID，返回缩略图 URL                 |
| `deletePendingImagesAction` | 批量删除所有待清理的孤儿图片（取消编辑 / 发布失败时调用）   |
| `deletePendingVideosAction` | 批量删除所有待清理的孤儿视频（取消编辑 / 发布失败时调用）   |

---

## `user.store.ts` — 用户、关注缓存与收藏夹（19 个 action）

| action                  | 注释                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| `updateOnlineUsers`     | 更新在线用户列表，并将当前登录用户置顶                              |
| `logOut`                | 断开在线连接、清空 token/用户信息缓存；可选整页刷新，否则弹出登录框 |
| `initProfile`           | 清空当前查看的他人资料页 `profile`                                  |
| `registerAction`        | 用户注册，成功后自动走登录流程                                      |
| `loginAction`           | 登录并拉取用户信息，写入缓存后刷新页面                              |
| `followAction`          | 关注/取关目标用户，失效相关关注缓存并刷新关注数据                   |
| `getProfileAction`      | 按用户 ID 拉取他人资料（写入 `profile`）                            |
| `getCollectAction`      | 拉取用户收藏夹列表（默认当前用户）                                  |
| `addCollectAction`      | 新建收藏夹并刷新列表                                                |
| `collectAction`         | 将文章加入/移出收藏（接口语义由后端区分），成功后刷新收藏夹         |
| `getFollowAction`       | 获取指定用户关注/粉丝信息（带 TTL 缓存与并发去重）                  |
| `invalidateFollowCache` | 使某用户的关注信息缓存失效（关注/取关后调用）                       |
| `getMyFollowAction`     | 拉取登录用户自身的关注/粉丝信息（`myFollowInfo`，供导航等使用）     |
| `uploadAvatarAction`    | 上传头像并更新 `userInfo.avatarUrl` 与本地缓存                      |
| `updateProfileAction`   | 提交资料修改，成功则刷新页面                                        |
| `reportAction`          | 举报用户                                                            |
| `removeCollectArticle`  | 从收藏夹移除文章；按返回结果刷新列表或触发清空回退事件              |
| `updateCollectAction`   | 修改收藏夹名称并刷新列表                                            |
| `removeCollectAction`   | 删除收藏夹并刷新列表                                                |

---

## `comment.store.ts` — 评论共享状态（6 个 action）

主要列表逻辑在 `useCommentList`；本 store 承载跨组件共享状态与点赞同步。

| action               | 注释                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `setActiveReply`     | 切换「当前回复」的评论 ID（重复点击同一 ID 则关闭；会关闭编辑态） |
| `setActiveEdit`      | 切换「当前编辑」的评论 ID（重复点击关闭；会关闭回复态）           |
| `closeAllForms`      | 关闭回复与编辑表单状态                                            |
| `getCommentAction`   | 拉取用户历史评论列表；登录时顺带刷新评论点赞 ID 列表              |
| `getUserLikedAction` | 拉取当前用户点赞过的评论 ID 列表                                  |
| `likeAction`         | 点赞/取消点赞评论，更新列表内点赞数并刷新点赞 ID 列表             |

---

## `home.store.ts` — 首页资讯与热门作者（2 个 action）

| action              | 注释                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `getNewsAction`     | 获取资讯（优先读本地缓存 `news`，无则请求并缓存）；过滤无封面条目 |
| `getHotUsersAction` | 获取首页热门作者列表                                              |

---

## `loading.store.ts` — 分 key 请求计数与超时保护（5 个 action）

| action           | 注释                                                    |
| ---------------- | ------------------------------------------------------- |
| `clearTimer`     | 清除某个 key 对应的超时定时器                           |
| `clearAllTimers` | 清除全部超时定时器                                      |
| `start`          | 为指定 key 增加进行中计数，并可选设置超时后强制 `reset` |
| `end`            | 为指定 key 减少计数，归零时删除 key 并清理定时器        |
| `reset`          | 重置指定 key 或清空全部计数与定时器                     |

---

## `history.store.ts` — 浏览历史（5 个 action）

| action                | 注释                                          |
| --------------------- | --------------------------------------------- |
| `addHistoryAction`    | 添加单条浏览记录（需登录等由接口侧处理）      |
| `getHistoryAction`    | 分页拉取浏览历史；支持 `reset` 从头加载或追加 |
| `deleteHistoryAction` | 删除单条浏览记录并同步本地列表与 total        |
| `clearHistoryAction`  | 清空全部浏览历史                              |
| `resetHistory`        | 重置内存中的列表、分页与 loading 状态         |

---

## 类型与辅助

| 路径                      | 说明                      |
| ------------------------- | ------------------------- |
| `types/article.result.ts` | 文章列表/详情、标签等类型 |
| `types/user.result.ts`    | 用户、关注、收藏夹等类型  |
| `types/comment.result.ts` | 评论结构类型              |
| `types/history.result.ts` | 浏览历史 state 类型       |
