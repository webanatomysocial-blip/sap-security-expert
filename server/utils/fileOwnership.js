// Permanent file ownership for paid downloads.
//
// Every uploaded download file has one owner row (file_ownership). The owner sets
// the file's price; no other account can change it, and deleting a post never moves
// ownership. Posts that embed a file must carry the owner's price — any other value
// is rewritten to it on save. Admins can override a price only with a stated reason,
// and every price change is written to file_ownership_audit.
//
// Tables are created by scripts/migrations (not at runtime), so production schema
// changes stay explicit.
'use strict';

const TAG_RE = /<[^>]*data-file-url=["']([^"']+)["'][^>]*>/gi;
const CREDITS_RE = /data-credits=["'](\d+)["']/i;

class OwnershipError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Pure: list the file blocks in a post body.
function findFileBlocks(html) {
  const blocks = [];
  if (typeof html !== 'string') return blocks;
  for (const m of html.matchAll(TAG_RE)) {
    const c = m[0].match(CREDITS_RE);
    blocks.push({ url: m[1], credits: c ? parseInt(c[1], 10) : null });
  }
  return blocks;
}

// Pure: set data-credits on every block for `url` to `credits`.
function setBlockCredits(html, url, credits) {
  return html.replace(TAG_RE, (tag, fileUrl) => {
    if (fileUrl !== url) return tag;
    if (CREDITS_RE.test(tag)) return tag.replace(CREDITS_RE, `data-credits="${credits}"`);
    return tag.replace(/>$/, ` data-credits="${credits}">`);
  });
}

async function getOwner(db, fileUrl) {
  const [[row]] = await db.execute(
    'SELECT file_url, owner_user_id, price_credits, needs_review, deleted_at FROM file_ownership WHERE file_url = ? LIMIT 1',
    [fileUrl]
  );
  return row || null;
}

// Records the uploader as owner. A file already registered keeps its owner.
async function registerUpload(db, { fileUrl, ownerUserId, price = 0 }) {
  if (await getOwner(db, fileUrl)) return false;
  try {
    await db.execute(
      'INSERT INTO file_ownership (file_url, owner_user_id, price_credits, source, needs_review) VALUES (?, ?, ?, ?, 0)',
      [fileUrl, ownerUserId, price, 'upload']
    );
  } catch (err) {
    if (/UNIQUE|Duplicate|ER_DUP/i.test(String(err.message))) return false; // lost a race: owner already set
    throw err;
  }
  await audit(db, { fileUrl, action: 'register', actorUserId: ownerUserId, oldPrice: null, newPrice: price, reason: 'upload' });
  return true;
}

async function audit(db, { fileUrl, action, actorUserId, oldPrice, newPrice, reason }) {
  await db.execute(
    'INSERT INTO file_ownership_audit (file_url, action, actor_user_id, old_price, new_price, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [fileUrl, action, actorUserId ?? null, oldPrice ?? null, newPrice ?? null, reason ?? null]
  );
}

async function setPrice(db, { fileUrl, actorUserId, credits, action, reason }) {
  const current = await getOwner(db, fileUrl);
  await db.execute('UPDATE file_ownership SET price_credits = ?, needs_review = 0, updated_at = CURRENT_TIMESTAMP WHERE file_url = ?', [credits, fileUrl]);
  await audit(db, { fileUrl, action, actorUserId, oldPrice: current?.price_credits, newPrice: credits, reason });
}

/**
 * Applies ownership to a post body before it is saved.
 *  - Owner's blocks keep the owner's chosen price (changing it is an owner price change).
 *  - Other accounts' blocks are rewritten to the owner's price.
 *  - A file with no owner row can only be registered by an admin, and is flagged
 *    for review; a contributor embedding an unregistered file is refused.
 * Returns the rewritten body.
 */
async function applyOwnershipToBody(db, { html, actorUserId, isAdmin }) {
  let out = html;
  const seen = new Set();
  for (const block of findFileBlocks(html)) {
    if (seen.has(block.url)) continue;
    seen.add(block.url);
    const owner = await getOwner(db, block.url);
    if (!owner) {
      if (!isAdmin) throw new OwnershipError(`File ${block.url} is not registered. Upload it from the editor.`, 400);
      await db.execute(
        'INSERT INTO file_ownership (file_url, owner_user_id, price_credits, source, needs_review) VALUES (?, ?, ?, ?, 1)',
        [block.url, actorUserId, block.credits ?? 0, 'admin-claim']
      );
      await audit(db, { fileUrl: block.url, action: 'claim-unregistered', actorUserId, oldPrice: null, newPrice: block.credits ?? 0, reason: 'admin embedded unregistered file' });
      continue;
    }
    if (owner.deleted_at) throw new OwnershipError(`File ${block.url} has been removed.`, 400);
    if (Number(owner.owner_user_id) === Number(actorUserId)) {
      // Owner: the chosen price becomes the file's price.
      if (block.credits !== null && block.credits !== Number(owner.price_credits)) {
        await setPrice(db, { fileUrl: block.url, actorUserId, credits: block.credits, action: 'owner-price-change', reason: 'set by owner' });
      }
    } else {
      // Everyone else is held to the owner's price.
      out = setBlockCredits(out, block.url, Number(owner.price_credits));
    }
  }
  return out;
}

// Owner or admin may delete a physical file. Never anyone else.
function canDeleteFile(owner, { actorUserId, isAdmin }) {
  if (!owner) return isAdmin === true;
  return isAdmin === true || Number(owner.owner_user_id) === Number(actorUserId);
}

// Admin override: explicit reason required; audited.
async function adminOverridePrice(db, { fileUrl, adminUserId, isAdmin, credits, reason }) {
  if (!isAdmin) throw new OwnershipError('Only an administrator can override a file price.', 403);
  if (!Number.isInteger(credits) || credits < 0 || credits > 10000) throw new OwnershipError('credits must be an integer from 0 to 10000.', 400);
  if (typeof reason !== 'string' || reason.trim().length < 5) throw new OwnershipError('A reason of at least 5 characters is required.', 400);
  const owner = await getOwner(db, fileUrl);
  if (!owner) throw new OwnershipError('File is not registered.', 404);
  await setPrice(db, { fileUrl, actorUserId: adminUserId, credits, action: 'admin-override', reason: reason.trim().slice(0, 240) });
}

// Marks the file deleted (the owner row stays, so ownership history is kept).
async function markDeleted(db, { fileUrl, actorUserId }) {
  await db.execute('UPDATE file_ownership SET deleted_at = CURRENT_TIMESTAMP WHERE file_url = ? AND deleted_at IS NULL', [fileUrl]);
  await audit(db, { fileUrl, action: 'deleted', actorUserId, oldPrice: null, newPrice: null, reason: 'physical file removed' });
}

module.exports = {
  markDeleted,
  OwnershipError, findFileBlocks, setBlockCredits, getOwner, registerUpload,
  applyOwnershipToBody, canDeleteFile, adminOverridePrice, audit,
};
