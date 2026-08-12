# Flow image upload acceptance checklist

Use this checklist after the server and client automated gates pass. Record the browser, viewport, account, media IDs, Flow ID, and observed request URLs so another operator can repeat the run.

## Runtime limits

- [ ] Maximum 9 files/post.
- [ ] Maximum 10MB/file.
- [ ] Maximum 30MB/selection.
- [ ] Maximum 40MP decoded limit.
- [ ] Maximum 3 concurrent client uploads.
- [ ] Pending orphan TTL is 7 days.

These limits are code-enforced rollout guardrails, not environment overrides.

## Setup and evidence

- [ ] Start PostgreSQL and the server on `http://127.0.0.1:8000`, then start the client and open `/flow`.
- [ ] Serve the client from HTTPS or a loopback origin such as `http://127.0.0.1`; stop if `crypto.randomUUID` is unavailable. Plain HTTP on a LAN address is not a secure browser context.
- [ ] Use an authenticated test account that owns no media needed by another test. Record the user ID: `________`.
- [ ] Prepare valid JPEG, PNG, and WebP samples; 10MB-boundary, 30MB-selection, and 40MP-boundary samples; one unsupported file; and one image reserved for an induced upload failure.
- [ ] Open DevTools Network with Preserve log enabled and disable cache. Record desktop browser/version: `________`.
- [ ] Capture starting `window.scrollY`: `________`. Opening and closing the composer must preserve this value.

## Desktop acceptance

- [ ] Open the composer with the cord. Select valid images and confirm each retained tile shows upload progress and resolves to an uploaded state.
- [ ] Paste an image into the editor. Confirm the browser delegates it to the attachment queue without embedding a base64/blob image in the Tiptap document.
- [ ] Drop an image over the editor. Confirm the same queue behavior and no duplicate browser navigation.
- [ ] Add up to 9 retained images. Confirm a tenth file is rejected and that removing one restores one slot.
- [ ] Select an image over 10MB, a selection over 30MB, and an image over the 40MP decoded limit. Confirm each is rejected with the matching limit and no retained uploaded media ID.
- [ ] Observe Network while adding at least 4 images. Confirm no more than 3 `POST /media/images` requests are active concurrently.
- [ ] Force one upload to fail, restore connectivity/server behavior, and retry. Confirm the failed tile is retained and becomes uploaded after retry.
- [ ] Remove an uploaded image. Confirm `DELETE /media/images/:mediaId` succeeds before the tile disappears.
- [ ] Focus a tile's move controls and reorder with the keyboard. Confirm visual order, `mediaIds`, and the later `flow_post_media.position` order agree.
- [ ] Enter recognizable text, close with the close button, and reopen with the cord. Confirm text and uploaded attachment order are retained.
- [ ] Close with `Esc`, reopen, then close with the cord. Confirm each close retains the draft and attachments.
- [ ] After every open and close path, compare `window.scrollY` with the starting value and confirm it is unchanged.
- [ ] Publish once. Confirm the composer stays locked during the request, closes after success, and the new item appears after the Feed first-page refresh without a full-page reload.
- [ ] In Network and the rendered feed, confirm gallery tiles request `thumbnailUrl`/small URLs; open the lightbox and confirm it requests the original `url`.
- [ ] Confirm feed body HTML is rendered without executable scripts or unsafe attributes.

## 390px acceptance

- [ ] Set the viewport width to 390px and repeat selection, paste, drop, upload progress, failure/retry, removal, keyboard reorder, close/reopen, `Esc`, cord close, and every limit rejection from the desktop run, including the 9 retained images cap.
- [ ] Publish at 390px. Confirm the new item appears after the Feed first-page refresh, gallery tiles use `thumbnailUrl`/small URLs, and the lightbox uses the original `url`.
- [ ] Confirm picker, tiles, move/remove/retry controls, publish, close, and the cord remain visible and operable without horizontal page overflow.
- [ ] Confirm opening and closing the composer does not change `window.scrollY` at 390px.

## Resilience and accessibility

- [ ] At desktop and 390px, emulate `prefers-reduced-motion: reduce`. Confirm composer/feed transitions and celebration effects do not require motion to understand state or complete an action.
- [ ] At desktop and 390px, expire or replace the auth token, then attempt upload and publish. Confirm the app surfaces the authentication failure, retains recoverable composer state, and does not show a false success.
- [ ] At desktop and 390px, go offline during an upload. Confirm the tile remains failed/retryable. Restore connectivity and retry successfully.
- [ ] At desktop and 390px, go offline during publish. Confirm text, attachments, order, and retry identity are retained. Restore connectivity and publish successfully.

## Read-only post-acceptance audit

Run these queries against the acceptance database. Every query except the final expected-orphan inventory should return zero rows.

```sql
-- A file may belong to at most one Flow.
SELECT file_id, COUNT(*) AS uses
FROM flow_post_media
GROUP BY file_id
HAVING COUNT(*) > 1;

-- Positions must be unique and contiguous from zero for every Flow.
SELECT flow_id,
       COUNT(*) AS media_count,
       COUNT(DISTINCT position) AS distinct_positions,
       MIN(position) AS min_position,
       MAX(position) AS max_position
FROM flow_post_media
GROUP BY flow_id
HAVING COUNT(*) <> COUNT(DISTINCT position)
    OR MIN(position) <> 0
    OR MAX(position) <> COUNT(*) - 1;

-- Associated media must have the same owner as the Flow.
SELECT fm.flow_id, fm.file_id, fp.user_id AS flow_user_id, f.user_id AS file_user_id
FROM flow_post_media fm
JOIN flow_post fp ON fp.id = fm.flow_id
JOIN file f ON f.id = fm.file_id
WHERE fp.user_id IS DISTINCT FROM f.user_id;

-- Inspect old unattached images; explain every returned row before cleanup.
SELECT f.id, f.user_id, f.filename, f.create_at
FROM file f
WHERE f.file_type = 'image'
  AND f.article_id IS NULL
  AND f.draft_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM flow_post_media fm WHERE fm.file_id = f.id)
  AND f.create_at < NOW() - INTERVAL '7 days'
ORDER BY f.create_at, f.id;
```

- [ ] Run the existing read-only physical inventory: `npm run media:migrate -- inventory --limit 1000` from `coderx_server`.
- [ ] Confirm no physical file created during acceptance appears under `filesystemExtras` without a matching `file` row.
- [ ] Record Flow ID: `________`; ordered media IDs: `________`; inventory result/evidence path: `________`.
