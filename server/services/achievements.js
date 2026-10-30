// Achievements are granted (and their email sent) at the moment the triggering
// event happens — comment approval, contributor approval, bonus grants, referral
// approval, login — never as a side effect of viewing the Achievements page.
const repo = require('../repositories/membersRepository');
const MailService = require('./MailService');

// Email clients don't load the Bootstrap Icons font, so map each achievement to an emoji.
const ACHIEVEMENT_EMAIL_EMOJI = {
  welcome: '✨',
  first_comment: '💬',
  '100_helpful_comments': '🏆',
  top_contributor: '✍️',
  profile_complete: '✅',
  linkedin_ambassador: '💼',
  first_referral: '🤝',
};

const siteUrl = () => (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

// Grants once; emails only on the first grant.
async function grantAndNotify(db, memberId, achievementId, member) {
  await repo.ensureAchievementTables(db);
  if (!await repo.insertAchievement(db, memberId, achievementId)) return false; // already earned → no repeat mail

  const type = await repo.findAchievementType(db, achievementId);
  const mailer = MailService.getInstance();
  if (type && member?.email && mailer) {
    const sent = await mailer.send(
      db,
      member.email,
      `🏅 Achievement Unlocked: ${type.label}`,
      'member/achievement_unlocked',
      {
        name: member.name || 'Member',
        label: type.label,
        description: type.description,
        icon: ACHIEVEMENT_EMAIL_EMOJI[achievementId] || '🏅',
        achievements_url: `${siteUrl()}/member/achievements`,
      }
    );
    if (sent) await repo.markAchievementEmailSent(db, memberId, achievementId);
  }
  return true;
}

// Evaluates every rule for one member and grants whatever is newly earned.
async function syncAchievements(db, memberId) {
  if (!memberId) return;
  const member = await repo.findMemberEmailAndName(db, memberId);
  if (!member) return;
  const grant = (id) => grantAndNotify(db, memberId, id, member);

  await grant('welcome');

  const commentCount = await repo.countApprovedComments(db, memberId);
  if (commentCount >= 1) await grant('first_comment');
  if (commentCount >= 100) await grant('100_helpful_comments');

  if (member.email && await repo.findContributorApprovedByEmail(db, member.email)) await grant('top_contributor');
  if (await repo.hasCreditTransactionNote(db, memberId, 'Complete profile bonus')) await grant('profile_complete');
  if (await repo.hasCreditTransactionNote(db, memberId, 'LinkedIn share bonus')) await grant('linkedin_ambassador');

  const ref = await repo.findReferralCodeById(db, memberId);
  if (ref?.referral_code && await repo.countApprovedReferrals(db, ref.referral_code) >= 1) await grant('first_referral');
}

// Fire-and-forget wrapper for request handlers — never blocks or fails the response.
function syncAchievementsInBackground(db, memberId) {
  syncAchievements(db, memberId).catch((err) => console.error('[achievements]', err.message));
}

module.exports = { grantAndNotify, syncAchievements, syncAchievementsInBackground };
