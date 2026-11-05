// Shared selection rule for legacy plaintext OTP rows in email_queue. Used by the inspection and
// purge scripts so both act on exactly the same rows.
//
// Legacy OTP rows were written by the retry queue (MailService.queueTransactional, now removed):
// blog_id is NULL and the body contains the phrase below followed by the code.
'use strict';
const PHRASE = 'Your verification code is:';
const WHERE = "blog_id IS NULL AND body LIKE ?";
const PARAM = `%${PHRASE}%`;
const OTP_SUBJECTS = ['Password Reset Verification Code', 'Account Deletion Verification Code', 'Verification Code'];
module.exports = { PHRASE, WHERE, PARAM, OTP_SUBJECTS };
