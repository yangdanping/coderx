# Pinia 状态管理

核对日期：2026-10-25。本文说明职责和边界；完整方法签名以链接源码为准，避免维护容易过期的 action 数量清单。

| Store                                            | 当前职责                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| [index.store.ts](./index.store.ts)               | 全局登录状态、登录/资料弹窗、资料编辑草稿、窗口尺寸、Token 校验和启动恢复       |
| [article.store.ts](./article.store.ts)           | 文章编辑与发布、图片/视频/标签关联，以及仍在使用的列表、推荐、详情和标签 action |
| [editor.store.ts](./editor.store.ts)             | 编辑器封面与待处理媒体 ID、上传及清理入口                                       |
| [online.store.ts](./online.store.ts)             | 应用在线用户列表、在线状态 getter 与连接清理                                    |
| [user.store.ts](./user.store.ts)                 | 登录/OAuth、当前用户和公开资料、关注关系缓存、收藏夹、头像与资料更新            |
| [comment.store.ts](./comment.store.ts)           | 跨组件回复/编辑状态、评论历史与点赞同步                                         |
| [notification.store.ts](./notification.store.ts) | 通知列表、未读计数、实时通知去重及已读标记                                      |
| [home.store.ts](./home.store.ts)                 | 首页资讯与热门作者                                                              |
| [loading.store.ts](./loading.store.ts)           | 按 key 计数的加载状态与超时处理                                                 |
| [history.store.ts](./history.store.ts)           | 浏览记录分页、删除和状态重置                                                    |

## 用户资料与关注

- `clearAuthState` 清除登录身份、私有收藏状态和 AI 缓存；公开关注缓存保留，访客可继续浏览。`logOut` 再按调用选项刷新页面或提示登录。
- `loginAction` 完成账号登录和本地缓存后刷新页面；`loginWithOAuthTokenAction` 为 OAuth / One Tap 建立会话，不整页刷新。
- `getProfileAction` 先清理旧资料，通过请求版本防止较早响应覆盖新页面，并维护 `profileStatus` / `profileError`。
- `followAction` 拒绝无效、自关注和同目标重复操作。成功写入后刷新双方公开关系；会话已切换时，旧请求不再展示属于前一会话的提示。
- `getFollowAction` 按用户缓存并合并并发读取；收藏夹另外校验归属及请求版本，避免切换资料或登录后混入旧结果。

## 与 TanStack Query 的分工

文章阅读列表、详情及点赞主要使用 `useArticleList`、`useArticleDetail`、`useUserLikedArticles` 和 `useLikeArticle`；Pinia 仍保留部分文章 action 供现有调用者使用。调整一项状态前先查调用点和 query key，避免新增第二份镜像缓存。评论列表主要由 `useCommentList` 管理。

文章发布将 `draftId` 交给后端创建文章并处理草稿，再关联媒体和标签，最后清理本地兜底草稿；不能把它和 Flow 的单次事务发布混为一谈。Flow 的草稿版本、媒体顺序和幂等协议见 [Flow 阶段说明](../../FLOW_RELEASE.md)。
