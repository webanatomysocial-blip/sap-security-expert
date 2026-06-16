import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLearningCounts } from '../services/api';
// next-disabled: import '../css/LearningHub.css'; — imported globally via globals.css

// ── Data ─────────────────────────────────────────────────────────────────────

const DIAG_QUESTIONS = [
  {
    q: 'How would you describe your SAP background?',
    helper: 'Be honest — wrong answer here means a wrong starting point.',
    options: [
      { label: "Never used SAP. I'm starting from scratch.", score: 0 },
      { label: 'Used SAP as an end user (e.g. data entry, reports).', score: 1 },
      { label: 'Worked with SAP technically (Basis, ABAP, functional consulting).', score: 2 },
      { label: 'Already done some SAP Security or GRC work.', score: 3 },
    ],
  },
  {
    q: 'Have you used SU01 or PFCG before?',
    helper: 'These are the bread-and-butter Security transactions.',
    options: [
      { label: "Never heard of them.", score: 0 },
      { label: "Heard the names, never opened them.", score: 1 },
      { label: "Used SU01, but PFCG is unfamiliar.", score: 2 },
      { label: "Used both regularly.", score: 3 },
    ],
  },
  {
    q: 'Do you know what Segregation of Duties (SoD) means?',
    helper: "It's the core of audit and compliance work.",
    options: [
      { label: "Not really.", score: 0 },
      { label: "Vaguely — I've heard the term.", score: 1 },
      { label: "Yes, I understand the principle.", score: 2 },
      { label: "Yes, and I've analyzed SoD conflicts before.", score: 3 },
    ],
  },
];

const MODULES = [
  {
    num: 1, slug: 'security-fundamentals',
    title: 'Security Fundamentals',
    desc: 'The ground floor of SAP Security. How SAP is structured, where security fits in, and the mental model you need before anything else makes sense.',
    topics: [
      { text: 'What SAP is and how it\'s organized' },
      { text: 'Security concepts in ERP context' },
      { text: 'The authorization model overview' },
      { text: 'Core terminology & concepts' },
    ],
    lessons: 8, videos: 5, articles: 3, locked: false,
  },
  {
    num: 2, slug: 'user-management',
    title: 'User Management',
    desc: 'How SAP users actually work — creation, maintenance, lifecycle, and the transactions you\'ll use every day.',
    topics: [
      { text: 'SU01', gloss: 'SU01 is the primary transaction for creating, editing, and deleting SAP user master records.', after: ' user master records' },
      { text: 'User types & license types' },
      { text: 'Password policies & locks' },
      { text: 'Mass maintenance (', gloss2: 'SU10', gloss2def: 'SU10 is the mass user maintenance transaction — used to update many users at once.', after2: ')' },
    ],
    lessons: 12, videos: 7, articles: 5, locked: false,
  },
  {
    num: 3, slug: 'role-management',
    title: 'Role Management',
    desc: 'The heart of SAP Security. Build, derive, and maintain the roles that drive every authorization decision.',
    topics: [
      { text: 'PFCG', gloss: 'PFCG (Profile Generator) is the transaction used to create, edit, and generate authorization roles in SAP.', after: ' role builder' },
      { text: 'Single, composite & derived roles' },
      { text: 'Profile generation' },
      { text: 'Role design strategy' },
    ],
    lessons: 16, videos: 10, articles: 6, locked: false,
  },
  {
    num: 4, slug: 'authorization-concepts',
    title: 'Authorization Concepts',
    desc: 'The plumbing underneath roles — auth objects, fields, values, and the runtime check engine.',
    topics: [
      { text: 'Authorization objects & fields' },
      { text: 'SU24', gloss: 'SU24 maintains the default authorization values proposed by PFCG when transactions are added to roles.', after: ' default values' },
      { text: 'Runtime auth checks' },
      { text: 'Troubleshooting with ', gloss2: 'SU53', gloss2def: 'SU53 displays the last failed authorization check for a user — the analyst\'s first stop for access issues.', after2: '' },
    ],
    lessons: 14, videos: 8, articles: 6, locked: true,
  },
  {
    num: 5, slug: 'audit-compliance',
    title: 'Audit & Compliance',
    desc: 'Tracking who did what, and proving it for auditors. Logs, reports, and the SoD conversation.',
    topics: [
      { text: 'Security Audit Log (', gloss2: 'SM20', gloss2def: 'SM20 displays the Security Audit Log — a record of security-relevant system events.', after2: ')' },
      { text: 'User Information System (', gloss2: 'SUIM', gloss2def: 'SUIM is the User Information System — read-only reporting on users, roles, and authorizations.', after2: ')' },
      { text: 'SoD', gloss: 'Segregation of Duties (SoD) is the principle that no single user should have authorizations enabling fraud, e.g. both creating and approving a payment.', after: ' basics' },
      { text: 'Audit prep checklists' },
    ],
    lessons: 10, videos: 6, articles: 4, locked: true,
  },
  {
    num: 6, slug: 'grc-advanced',
    title: 'GRC & Advanced Topics',
    desc: 'Beyond the basics: GRC Access Control, IAG, and the enterprise governance layer.',
    topics: [
      { text: 'SAP GRC Access Control' },
      { text: 'SAP ', gloss2: 'IAG', gloss2def: "IAG (Identity Access Governance) is SAP's cloud-based identity governance solution, extending GRC capabilities to the cloud.", after2: ' fundamentals' },
      { text: 'Emergency access (firefighter)' },
      { text: 'Enterprise SoD analysis' },
    ],
    lessons: 18, videos: 12, articles: 6, locked: true,
  },
];

const TEST_QUESTIONS = [
  {
    q: 'Which transaction code is used to maintain authorization roles in SAP?',
    options: [
      { text: 'SU01', correct: false, explain: 'SU01 maintains user master records — usernames, passwords, role assignments — but not the roles themselves.' },
      { text: 'PFCG', correct: true, explain: 'PFCG (Profile Generator) is where you create, edit, and generate authorization roles and their underlying profiles.' },
      { text: 'SM20', correct: false, explain: 'SM20 displays the Security Audit Log — useful for forensics, but not for role maintenance.' },
      { text: 'SUIM', correct: false, explain: 'SUIM is the User Information System — for analyzing and reporting on users, roles, and authorizations. Read-only.' },
    ],
  },
  {
    q: 'What is the primary purpose of a derived role in SAP?',
    options: [
      { text: 'To combine multiple single roles into one assignment', correct: false, explain: 'That describes a composite role, not a derived role.' },
      { text: 'To inherit menus and authorizations from a parent role while varying organizational values', correct: true, explain: 'Derived roles inherit the menu and authorizations from a parent (master) role, and only the organizational level values are maintained per derived child. This is how you scale one role across many plants, company codes, or business areas.' },
      { text: 'To grant temporary emergency access', correct: false, explain: 'Emergency access is handled through firefighter roles in GRC, not derived roles.' },
      { text: 'To replace single roles entirely', correct: false, explain: "Derived roles work alongside single and composite roles — they don't replace them." },
    ],
  },
  {
    q: 'In SAP authorization checks, what does the SU24 transaction maintain?',
    options: [
      { text: 'User passwords and lock status', correct: false, explain: 'User passwords and lock status are managed in SU01.' },
      { text: 'The Security Audit Log configuration', correct: false, explain: 'The Security Audit Log is configured via SM19 and displayed in SM20.' },
      { text: 'Default authorization object values for transactions', correct: true, explain: "SU24 maintains the default check indicators and proposed authorization values that PFCG pulls when you add a transaction to a role's menu. Good SU24 maintenance dramatically reduces manual auth work." },
      { text: 'License measurement parameters', correct: false, explain: 'License measurement is handled by USMM and the LAW.' },
    ],
  },
  {
    q: 'A user reports they cannot execute a transaction. Which tool shows the most recent failed authorization check for that user?',
    options: [
      { text: 'SM20 — Security Audit Log', correct: false, explain: "SM20 shows security audit events, but the standard first-stop tool for the user's most recent failed auth check is faster and more targeted." },
      { text: 'SU53 — Last Failed Authorization Check', correct: true, explain: "SU53 displays the last authorization check that failed for the user, including the exact object, field, and value that was missing. It's the analyst's first stop for \"I can't do X\" tickets." },
      { text: 'STAD — Workload Monitor', correct: false, explain: 'STAD shows transaction execution statistics, not authorization failures.' },
      { text: 'ST22 — Runtime Errors', correct: false, explain: 'ST22 captures ABAP runtime errors (dumps), not authorization failures.' },
    ],
  },
  {
    q: 'What is the difference between a composite role and a single role?',
    options: [
      { text: 'Composite roles contain authorizations directly; single roles only contain menus', correct: false, explain: "It's the other way around — single roles hold authorizations and menus, composite roles are wrappers." },
      { text: 'A composite role is a container that bundles multiple single roles together', correct: true, explain: 'A composite role holds no authorizations itself — it groups single roles for easier assignment. Useful when many users need the same combination of single roles.' },
      { text: 'Composite roles can only be assigned to administrators', correct: false, explain: 'Composite roles can be assigned to any user — there are no special role-type restrictions on who can receive them.' },
      { text: 'There is no functional difference — only naming', correct: false, explain: 'The functional difference is significant: single roles carry authorizations, composite roles bundle single roles.' },
    ],
  },
  {
    q: 'Which authorization object controls what fields a user can see and edit in PFCG itself?',
    options: [
      { text: 'S_USER_AGR', correct: true, explain: 'S_USER_AGR is the authorization object that controls administration access to roles (agreements) in PFCG — including activities like create, change, display, and delete.' },
      { text: 'S_TCODE', correct: false, explain: 'S_TCODE controls which transaction codes a user can execute. It governs entry to PFCG, but not what they can do once inside.' },
      { text: 'S_USER_GRP', correct: false, explain: 'S_USER_GRP controls user group administration in SU01 — not role administration in PFCG.' },
      { text: 'S_DEVELOP', correct: false, explain: 'S_DEVELOP controls ABAP development workbench access, unrelated to PFCG role maintenance.' },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need prior SAP experience?',
    a: "No. Module 01 starts with the absolute fundamentals — what SAP is, how it's structured, where security fits in. If you've used any enterprise software before, you'll keep up. The diagnostic will help you find the right starting point regardless of your background.",
  },
  {
    q: 'How does the test engine work?',
    a: "Each capability test gives you 25 questions, one at a time, with a timer. After every answer the engine tells you whether you got it right. If you got it wrong, the correct answer is revealed immediately with an explanation. Flag tough questions for review at the end. Your final score lands in one of four bands: Foundational, Developing, Proficient, or Expert.",
  },
  {
    q: 'Can I retake a test?',
    a: "Yes, unlimited times. Questions are pulled from a larger pool each attempt so you'll see fresh combinations. We track your best score per module.",
  },
  {
    q: 'Is the curriculum locked in order?',
    a: "The modules are sequenced because each one builds on the last — but you're free to jump ahead. Take the diagnostic and we'll mark your recommended starting point; the capability tests will tell you honestly whether you're ready.",
  },
  {
    q: 'Is this affiliated with SAP SE?',
    a: "No. This is an independent learning hub built by SAP Security practitioners. No formal affiliation, sponsorship, or endorsement by SAP SE or its subsidiaries.",
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRecoFromScore(total) {
  if (total <= 2)  return { num: 1, title: 'Security Fundamentals',  level: 'Beginner',      tag: 'Foundational', lessons: 8,  hours: '2.5h', modulesLeft: 5 };
  if (total <= 4)  return { num: 2, title: 'User Management',        level: 'Beginner',      tag: 'Foundational', lessons: 12, hours: '4h',   modulesLeft: 4 };
  if (total <= 6)  return { num: 3, title: 'Role Management',        level: 'Intermediate',  tag: 'Developing',   lessons: 16, hours: '5h',   modulesLeft: 3 };
  if (total <= 7)  return { num: 4, title: 'Authorization Concepts', level: 'Intermediate',  tag: 'Proficient',   lessons: 14, hours: '4.5h', modulesLeft: 2 };
  return             { num: 5, title: 'Audit & Compliance',          level: 'Advanced',      tag: 'Proficient',   lessons: 10, hours: '3.5h', modulesLeft: 1 };
}

function getResultBand(pct) {
  if (pct >= 90) return { cls: 'expert',      label: 'Expert',      title: 'Strong command of Role Management.', sub: "You're ready to take on real role design work. Consider moving to Authorization Concepts next." };
  if (pct >= 70) return { cls: 'proficient',  label: 'Proficient',  title: 'Solid working knowledge.',           sub: "You've got the core concepts. Brush up on the questions you missed, then move forward." };
  if (pct >= 50) return { cls: 'developing',  label: 'Developing',  title: "You're getting there.",              sub: 'Re-watch the videos and re-read the articles in Module 03, then re-attempt the test.' };
  return           { cls: 'foundational', label: 'Foundational', title: 'Start with the fundamentals.',        sub: 'Spend time with Module 03 — the videos and articles will fill in the gaps. Come back and re-attempt anytime.' };
}

function fireConfetti() {
  const colors = ['#E84A3D', '#F59E0B', '#16A34A', '#0A66C2', '#6D28D9'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'lh-confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '40vh';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);
    const angle = (Math.random() - 0.5) * 180;
    const distance = 200 + Math.random() * 400;
    const duration = 1500 + Math.random() * 1500;
    el.animate(
      [
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${Math.cos((angle * Math.PI) / 180) * distance}px, ${Math.sin((angle * Math.PI) / 180) * distance + 400}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration, easing: 'cubic-bezier(.22,.9,.36,1)' }
    );
    setTimeout(() => el.remove(), duration);
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModuleTopic({ topic }) {
  return (
    <li>
      {topic.gloss ? (
        <>
          <span className="lh-gloss" data-def={topic.gloss}>{topic.text}</span>
          {topic.after}
        </>
      ) : topic.gloss2 ? (
        <>
          {topic.text}
          <span className="lh-gloss" data-def={topic.gloss2def}>{topic.gloss2}</span>
          {topic.after2}
        </>
      ) : (
        topic.text
      )}
    </li>
  );
}

// ── Diagnostic Modal ──────────────────────────────────────────────────────────

function DiagModal({ open, onClose, onAccept }) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState([]);
  const [reco, setReco] = useState(null);

  const reset = useCallback(() => { setStep(0); setScores([]); setReco(null); }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function answer(score) {
    const newScores = [...scores, score];
    if (step + 1 >= DIAG_QUESTIONS.length) {
      const total = newScores.reduce((a, b) => a + b, 0);
      setReco(getRecoFromScore(total));
      setScores(newScores);
    } else {
      setScores(newScores);
      setStep(step + 1);
    }
  }

  if (!open) return null;
  const q = DIAG_QUESTIONS[step];

  return (
    <div className={`lh-modal-backdrop show`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal">
        <div className="lh-modal-header">
          <h3>{reco ? 'Your path is ready' : `Question ${step + 1} of ${DIAG_QUESTIONS.length}`}</h3>
          <button className="lh-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="lh-modal-body">
          <div className="lh-modal-progress" id="modalProgress">
            {DIAG_QUESTIONS.map((_, i) => (
              <span key={i} className={i <= (reco ? DIAG_QUESTIONS.length - 1 : step) ? 'active' : ''} />
            ))}
          </div>

          {reco ? (
            <div className="lh-diag-result">
              <div className="lh-diag-result-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3>Your starting point</h3>
              <p>Based on your answers, here's where to begin. We'll mark your recommended module in the curriculum below.</p>
              <div className="lh-rec-card">
                <div className="lh-rec-eyebrow">Module {String(reco.num).padStart(2, '0')} · {reco.level}</div>
                <div className="lh-rec-module">{reco.title}</div>
                <div className="lh-rec-meta">{reco.lessons} lessons · {reco.hours} · {reco.modulesLeft} more modules after this</div>
              </div>
              <button className="lh-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { onAccept(reco); onClose(); }}>
                Go to my path →
              </button>
            </div>
          ) : (
            <>
              <div className="lh-modal-question">{q.q}</div>
              <div className="lh-modal-helper">{q.helper}</div>
              <div className="lh-diag-options">
                {q.options.map((opt, idx) => (
                  <button key={idx} className="lh-diag-option" onClick={() => answer(opt.score)}>
                    <span className="lh-opt-num">{idx + 1}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────────────────────

function ShareModal({ open, onClose, result }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !result) return null;

  function shareTo(platform) {
    const text = `I scored ${result.pct}% (${result.band}) on the ${result.topic} capability test at SAP Security Expert.`;
    const url = 'https://sap.webanatomy.in';
    if (platform === 'linkedin') {
      window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank');
    } else if (platform === 'twitter') {
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank');
    } else {
      navigator.clipboard.writeText(text + ' ' + url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }

  return (
    <div className="lh-modal-backdrop show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 480 }}>
        <div className="lh-modal-header">
          <h3>Your capability score</h3>
          <button className="lh-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="lh-modal-body">
          <div style={{ background: 'linear-gradient(135deg,#0F1A2B 0%,#1E3A5F 100%)', borderRadius: 12, padding: '28px 24px', marginBottom: 20, textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .7, marginBottom: 14 }}>SAP Security Expert · Capability Test</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>I scored <em style={{ color: '#E84A3D', fontStyle: 'normal' }}>{result.pct}%</em></div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.15)', padding: '4px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{result.band}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{result.topic}</div>
            <div style={{ fontSize: 12, opacity: .7 }}>{result.correct} of {result.total} correct · capability test</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 12, opacity: .6 }}>
              <span>sap.webanatomy.in</span>
              <strong>#SAPSecurity</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { id: 'linkedin', icon: <svg viewBox="0 0 24 24" width="16" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>, label: 'LinkedIn' },
              { id: 'twitter', icon: <svg viewBox="0 0 24 24" width="16" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>, label: 'Twitter / X' },
              { id: 'copy', icon: <svg viewBox="0 0 24 24" width="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, label: copied ? 'Copied!' : 'Copy text' },
            ].map(btn => (
              <button key={btn.id} className="lh-btn-outline" style={{ flex: 1, justifyContent: 'center', gap: 6, fontSize: 13, padding: '10px 14px' }} onClick={() => shareTo(btn.id)}>
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Test Engine ───────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 52;
const TOTAL_TIME = 180;

function TestEngine() {
  const [phase, setPhase] = useState('intro'); // intro | running | results | review
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [shareOpen, setShareOpen] = useState(false);
  const timerRef = useRef(null);

  const ringOffset = phase === 'results'
    ? CIRCUMFERENCE * (1 - (answers.filter(a => a.status === 'correct').length / TEST_QUESTIONS.length))
    : CIRCUMFERENCE;

  function startTest() {
    setPhase('running');
    setIndex(0);
    setAnswers([]);
    setFlagged([]);
    setChosen(null);
    setLocked(false);
    setTimeLeft(TOTAL_TIME);
  }

  useEffect(() => {
    if (phase !== 'running') { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setAnswers(prev => {
            const filled = [...prev];
            while (filled.length < TEST_QUESTIONS.length) filled.push({ status: 'skipped', chosen: null });
            return filled;
          });
          setPhase('results');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  function toggleFlag() {
    setFlagged(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  }

  function handleAnswer(idx) {
    if (locked) return;
    setLocked(true);
    setChosen(idx);
    const correct = TEST_QUESTIONS[index].options[idx].correct;
    setAnswers(prev => [...prev, { status: correct ? 'correct' : 'wrong', chosen: idx }]);
  }

  function advance() {
    if (index + 1 >= TEST_QUESTIONS.length) {
      clearInterval(timerRef.current);
      setPhase('results');
    } else {
      setIndex(i => i + 1);
      setChosen(null);
      setLocked(false);
    }
  }

  function skipQuestion() {
    if (locked) return;
    setAnswers(prev => [...prev, { status: 'skipped', chosen: null }]);
    advance();
  }

  const timerClass = timeLeft <= 30 ? 'lh-test-timer danger' : timeLeft <= 60 ? 'lh-test-timer warning' : 'lh-test-timer';
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const progress = (index / TEST_QUESTIONS.length) * 100;

  const correct = answers.filter(a => a.status === 'correct').length;
  const wrong = answers.filter(a => a.status === 'wrong').length;
  const skipped = answers.filter(a => a.status === 'skipped').length;
  const pct = Math.round((correct / TEST_QUESTIONS.length) * 100);
  const band = getResultBand(pct);

  const currentQ = TEST_QUESTIONS[index] || TEST_QUESTIONS[0];

  return (
    <>
      <div className="lh-test-engine">

        {/* INTRO */}
        {phase === 'intro' && (
          <div className="lh-test-intro">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F59E0B', color: '#FFF', padding: '5px 11px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 18 }}>Capability Test</div>
            <h3>Role Management — Live Demo</h3>
            <p>A 6-question demo of the full 25-question test engine. Everything works: timer, flagging, wrong-answer reveals, end-of-test review, and a shareable score card.</p>
            <div className="lh-test-intro-grid">
              <div className="lh-intro-stat"><strong>6</strong><span>Demo Qs</span></div>
              <div className="lh-intro-stat"><strong>3m</strong><span>Demo timer</span></div>
              <div className="lh-intro-stat"><strong>Flag</strong><span>For review</span></div>
              <div className="lh-intro-stat"><strong>Share</strong><span>Your score</span></div>
            </div>
            <button className="lh-btn-primary" onClick={startTest}>Start the demo →</button>
          </div>
        )}

        {/* RUNNING */}
        {phase === 'running' && (
          <>
            <div className="lh-test-header">
              <div className="lh-test-title">
                <span className="lh-test-pill">In Progress</span>
                <div className="lh-test-title-text">
                  Role Management
                  <span>Capability Test · Demo</span>
                </div>
              </div>
              <div className="lh-test-meta">
                <div className={timerClass}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {mm}:{ss}
                </div>
                <div className="lh-test-counter">Q<strong>{index + 1}</strong>/{TEST_QUESTIONS.length}</div>
              </div>
            </div>
            <div className="lh-test-progress">
              <div className="lh-test-progress-fill" style={{ width: progress + '%' }} />
            </div>
            <div className="lh-test-body">
              <div className="lh-test-question-header">
                <div className="lh-test-question-number">Question {String(index + 1).padStart(2, '0')}</div>
                <button className={`lh-flag-btn${flagged.includes(index) ? ' flagged' : ''}`} onClick={toggleFlag}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  {flagged.includes(index) ? 'Flagged' : 'Flag for review'}
                </button>
              </div>
              <div className="lh-test-question">{currentQ.q}</div>
              <div className="lh-test-options">
                {currentQ.options.map((opt, idx) => {
                  let cls = 'lh-test-option';
                  if (locked) {
                    if (idx === chosen) cls += opt.correct ? ' correct' : ' wrong';
                    else if (opt.correct) cls += ' reveal-correct';
                  }
                  return (
                    <button key={idx} className={cls} onClick={() => handleAnswer(idx)} disabled={locked}>
                      <span className="lh-test-letter">{LETTERS[idx]}</span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
              {locked && chosen !== null && (
                <div className={`lh-test-feedback show ${currentQ.options[chosen].correct ? 'correct' : 'wrong'}`}>
                  <div className="lh-test-feedback-head">{currentQ.options[chosen].correct ? '✓ Correct' : '✗ Not quite'}</div>
                  <div>
                    {currentQ.options[chosen].correct ? (
                      currentQ.options[chosen].explain
                    ) : (
                      <>
                        <strong>The correct answer is {LETTERS[currentQ.options.findIndex(o => o.correct)]}: {currentQ.options.find(o => o.correct).text}.</strong>{' '}
                        {currentQ.options.find(o => o.correct).explain}
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="lh-test-actions">
                {!locked && <button className="lh-test-skip" onClick={skipQuestion}>Skip this question</button>}
                {locked && (
                  <button className="lh-btn-primary" onClick={advance}>
                    {index === TEST_QUESTIONS.length - 1 ? 'See your results →' : 'Next question →'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* RESULTS */}
        {phase === 'results' && (
          <div className="lh-test-results">
            {pct >= 90 && <div className="lh-results-celebration">★ Capability Test Complete ★</div>}
            <div className="lh-results-ring">
              <svg viewBox="0 0 120 120">
                <circle className="lh-ring-bg" cx="60" cy="60" r="52" fill="none" strokeWidth="10" stroke="var(--lh-line)" />
                <circle
                  className="lh-ring-fill"
                  cx="60" cy="60" r="52"
                  fill="none" strokeWidth="10" stroke="var(--lh-brand)" strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
                />
              </svg>
              <div className="lh-results-percentage">
                <strong>{pct}%</strong>
                <span>{correct} of {TEST_QUESTIONS.length}</span>
              </div>
            </div>
            <div className={`lh-results-band ${band.cls}`}>{band.label}</div>
            <div className="lh-results-title">{band.title}</div>
            <div className="lh-results-sub">{band.sub}</div>
            <div className="lh-results-breakdown">
              <div className="lh-breakdown-stat correct"><strong>{correct}</strong><span>Correct</span></div>
              <div className="lh-breakdown-stat wrong"><strong>{wrong}</strong><span>Wrong</span></div>
              <div className="lh-breakdown-stat skipped"><strong>{skipped}</strong><span>Skipped</span></div>
              <div className="lh-breakdown-stat flagged"><strong>{flagged.length}</strong><span>Flagged</span></div>
            </div>
            <div className="lh-results-actions">
              <button className="lh-btn-outline" onClick={() => setPhase('review')}>Review answers</button>
              <button className="lh-btn-outline" onClick={() => setShareOpen(true)}>Share my score</button>
              <button className="lh-btn-primary" onClick={startTest}>Re-attempt</button>
            </div>
          </div>
        )}

        {/* REVIEW */}
        {phase === 'review' && (
          <div className="lh-test-review">
            <div className="lh-review-header">
              <h3>Review your answers</h3>
              <button className="lh-btn-outline" onClick={() => setPhase('results')}>Back to results</button>
            </div>
            <div className="lh-review-list">
              {TEST_QUESTIONS.map((q, i) => {
                const ans = answers[i];
                const status = ans ? ans.status : 'skipped';
                const correctIdx = q.options.findIndex(o => o.correct);
                return (
                  <div key={i} className="lh-review-item">
                    <div className="lh-review-item-head">
                      <span className="lh-review-q-num">Question {String(i + 1).padStart(2, '0')}</span>
                      <span className={`lh-review-status ${status}`}>{status}</span>
                    </div>
                    <div className="lh-review-q">{q.q}</div>
                    <div className="lh-review-answer">
                      {status === 'correct' && (
                        <><span className="lh-answer-label">Your answer:</span> {LETTERS[ans.chosen]}. {q.options[ans.chosen].text} — correct.</>
                      )}
                      {status === 'wrong' && (
                        <><span className="lh-answer-label">Your answer:</span> {LETTERS[ans.chosen]}. {q.options[ans.chosen].text}<br />
                          <span className="lh-answer-label">Correct answer:</span> {LETTERS[correctIdx]}. {q.options[correctIdx].text}<br /><br />
                          {q.options[correctIdx].explain}</>
                      )}
                      {status === 'skipped' && (
                        <><span className="lh-answer-label">Skipped.</span><br />
                          <span className="lh-answer-label">Correct answer:</span> {LETTERS[correctIdx]}. {q.options[correctIdx].text}<br /><br />
                          {q.options[correctIdx].explain}</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="lh-btn-primary" onClick={startTest}>Re-attempt the test</button>
            </div>
          </div>
        )}
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        result={{ pct, correct, total: TEST_QUESTIONS.length, band: band.label, topic: 'Role Management' }}
      />

      {pct >= 90 && phase === 'results' && (() => { fireConfetti(); return null; })()}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LearningHub() {
  const [diagOpen, setDiagOpen] = useState(false);
  const [reco, setReco] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [learningCounts, setLearningCounts] = useState({});
  const progressBarRef = useRef(null);

  // Fetch live learning article counts per module
  useEffect(() => {
    getLearningCounts().then(res => { if (res.data) setLearningCounts(res.data); }).catch(() => {});
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.lh-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Animate progress bar when it appears
  useEffect(() => {
    if (!reco || !progressBarRef.current) return;
    const timer = setTimeout(() => { if (progressBarRef.current) progressBarRef.current.style.width = '6%'; }, 200);
    return () => clearTimeout(timer);
  }, [reco]);

  function handleAcceptReco(r) {
    setReco(r);
    document.getElementById('lh-curriculum')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="learning-hub-page">

      {/* ── Hero ── */}
      <section className="lh-hero">
        <div className="container">
          <div className="lh-hero-grid">
            <div className="lh-hero-content">
              <div className="lh-hero-eyebrow">SAP Security Learning Hub</div>
              <h1 className="lh-hero-title">
                Learn SAP Security.<br />
                <span>The way practitioners do.</span>
              </h1>
              <p className="lh-hero-sub">
                Six structured modules, written articles, screen-recorded walkthroughs, and
                a live test engine — built by working SAP Security professionals, not trainers.
              </p>
              <div className="lh-hero-actions">
                <button className="lh-btn-primary" onClick={() => setDiagOpen(true)}>Find my starting point →</button>
                <a href="#lh-curriculum" className="lh-btn-outline">Browse the curriculum</a>
              </div>
              <div className="lh-hero-trust">
                <span>Structured learning path</span>
                <span>Hands-on test engine</span>
                <span>Practitioner-built</span>
              </div>
            </div>

            {/* Hero card */}
            <div className="lh-hero-card-wrap">
              {reco ? (
                <div className="lh-progress-card show">
                  <div className="lh-card-label">
                    <span className="lh-dot" /> Your path is active
                  </div>
                  <div className="lh-level">Your level: {reco.level} · {reco.tag}</div>
                  <h3>Module {String(reco.num).padStart(2, '0')} · {reco.title}</h3>
                  <div className="lh-progress-bar">
                    <div className="lh-progress-bar-fill" ref={progressBarRef} />
                  </div>
                  <div className="lh-progress-meta">
                    <span>0 of {reco.lessons} lessons</span>
                    <span>0%</span>
                  </div>
                  <div className="lh-progress-stats">
                    <div className="lh-progress-stat"><strong>{reco.modulesLeft + 1}</strong><span>Modules</span></div>
                    <div className="lh-progress-stat"><strong>{reco.lessons + Math.round(reco.lessons * 1.8)}</strong><span>Lessons</span></div>
                    <div className="lh-progress-stat"><strong>{reco.hours}</strong><span>Content</span></div>
                  </div>
                  <button className="lh-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => document.getElementById('lh-curriculum')?.scrollIntoView({ behavior: 'smooth' })}>
                    Continue to module →
                  </button>
                  <button className="lh-sample-pill" onClick={() => setReco(null)} style={{ marginTop: 10 }}>
                    <svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>
                    Retake diagnostic
                  </button>
                </div>
              ) : (
                <div className="lh-diagnostic-card" id="diagnosticCard">
                  <div className="lh-card-label">
                    <span className="lh-dot" /> Personalized path
                  </div>
                  <h3>Not sure where to start?</h3>
                  <p>Three questions. 90 seconds. We'll identify your entry point in the curriculum and explain why.</p>
                  <div className="lh-diagnostic-meta">
                    <span>
                      <svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      ~90 seconds
                    </span>
                    <span>3 questions</span>
                    <span>Instant result</span>
                  </div>
                  <button className="lh-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setDiagOpen(true)}>
                    Take the diagnostic →
                  </button>
                  <button className="lh-sample-pill" onClick={() => document.getElementById('test-engine')?.scrollIntoView({ behavior: 'smooth' })}>
                    <svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>
                    Or try a sample test first
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="lh-pillars-section">
        <div className="container">
          <div className="lh-pillars-grid">
            {[
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, title: 'Structured curriculum', desc: 'Six modules in sequence. Each one builds on the last. No jumping between scattered resources.' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, title: 'Practitioner-made video', desc: 'Real SAP system. Real transactions. Screen-recorded by people doing this work every week.' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>, title: 'Live test engine', desc: 'Timer. Flagging. Instant feedback. Shareable score card. Know where you stand before you interview.' },
            ].map((p, i) => (
              <div key={i} className="lh-pillar">
                <div className="lh-pillar-icon">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum ── */}
      <section className="lh-section lh-curriculum-section" id="lh-curriculum">
        <div className="container">
          <div className="lh-section-head lh-reveal">
            <span className="lh-section-eyebrow">Curriculum</span>
            <h2>Six modules. One complete picture.</h2>
            <p>From "what is SAP" to enterprise GRC — structured so every module builds on the one before it.</p>
          </div>
          <div className="lh-curriculum-grid">
            {MODULES.map(m => {
              const liveCount = learningCounts[m.slug] || 0;
              const isAvailable = liveCount > 0;
              return (
                <div
                  key={m.num}
                  className={`lh-module-card lh-reveal${!isAvailable ? ' locked' : ''}${reco?.num === m.num ? ' recommended' : ''}`}
                  data-module={m.num}
                >
                  <div className="lh-module-header">
                    <span className="lh-module-number">{String(m.num).padStart(2, '0')}</span>
                    <span className={`lh-module-status ${isAvailable ? 'available' : 'locked'}`}>
                      {isAvailable ? 'Available' : 'Coming soon'}
                    </span>
                  </div>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                  <ul className="lh-module-topics">
                    {m.topics.map((t, i) => <ModuleTopic key={i} topic={t} />)}
                  </ul>
                  <div className="lh-module-meta">
                    <span>
                      <i className="bi bi-journals" style={{ marginRight: '5px', opacity: .6 }} />
                      {liveCount} article{liveCount !== 1 ? 's' : ''}
                    </span>
                    <div className="lh-module-meta-stats">
                      <span title="Videos">▶ 0</span>
                      <span title="Articles">≡ {liveCount}</span>
                    </div>
                  </div>
                  {isAvailable && (
                    <Link to={`/learning/${m.slug}`} className="lh-module-browse-link">
                      Browse articles <i className="bi bi-arrow-right" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Formats ── */}
      <section className="lh-section lh-formats-section">
        <div className="container">
          <div className="lh-section-head lh-reveal">
            <span className="lh-section-eyebrow">How You Learn</span>
            <h2>Read it. Watch it. Prove you know it.</h2>
            <p>Every topic is covered in three formats so you encounter the same concept from three different angles.</p>
          </div>
          <div className="lh-formats-grid">
            {[
              { icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>, title: 'Technical videos', desc: 'Screen-recorded walkthroughs by practicing SAP Security professionals. Real system, real T-codes, real screens.', meta: 'Watch · Replay · Bookmark' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>, title: 'Written articles', desc: 'Reference material you\'ll return to during real work. Searchable, copyable, with diagrams and code snippets.', meta: 'Read · Search · Reference' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>, title: 'Test engine', desc: '25 questions per attempt. One at a time. Timer, flag for review, wrong-answer reveals, shareable result card.', meta: 'Test · Learn · Share' },
            ].map((f, i) => (
              <div key={i} className="lh-format-card lh-reveal">
                <div className="lh-format-icon-wrap">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="lh-format-meta">{f.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instructors ── */}
      <section className="lh-section lh-instructors-section">
        <div className="container">
          <div className="lh-section-head lh-reveal">
            <span className="lh-section-eyebrow">Meet Your Instructors</span>
            <h2>Practitioners, not influencers.</h2>
            <p>Every lesson is built and reviewed by working SAP Security professionals. No theory-only trainers — people who design roles, run audits, and ship security tickets every week.</p>
          </div>
          <div className="lh-instructors-grid">
            {[
              { initials: 'PR', cls: 'lh-avatar-1', name: 'Priya Rangarajan', role: 'Lead Curriculum Designer · Role Management', bio: 'Twelve years designing SAP authorization frameworks for global retail and pharma. Designed Module 03 from the ground up.', lessons: 22 },
              { initials: 'MO', cls: 'lh-avatar-2', name: 'Marcus Okonkwo', role: 'Senior Author · Cybersecurity & BTP', bio: 'Eight years in SAP cybersecurity, with a focus on BTP hardening and audit-log forensics. Covers Modules 05 and the BTP track.', lessons: 18 },
              { initials: 'SK', cls: 'lh-avatar-3', name: 'Sandra Köhler', role: 'GRC & IAG Specialist · Audit Reviewer', bio: 'Fifteen years implementing GRC Access Control and IAG across Fortune 500 manufacturing and financial services clients.', lessons: 14 },
            ].map((inst, i) => (
              <div key={i} className="lh-instructor-card lh-reveal">
                <div className={`lh-instructor-avatar ${inst.cls}`}>{inst.initials}</div>
                <h3>{inst.name}</h3>
                <div className="lh-instructor-role">{inst.role}</div>
                <p className="lh-instructor-bio">{inst.bio}</p>
                <div className="lh-instructor-meta">
                  <span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    LinkedIn
                  </span>
                  <span>{inst.lessons} lessons authored</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Test Engine ── */}
      <section className="lh-section lh-test-section" id="test-engine">
        <div className="container">
          <div className="lh-section-head lh-reveal">
            <span className="lh-section-eyebrow">Test Engine</span>
            <h2>25 questions. One at a time. Honest feedback.</h2>
            <p>Pick a topic, take the test. Timer counts down. Flag tough questions for review. Wrong answers reveal the correct one with an explanation. At the end, see every question you got wrong — and share your capability score if you want.</p>
          </div>
          <div className="lh-test-wrapper lh-reveal">
            <TestEngine />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lh-section lh-faq-section" id="faq">
        <div className="container">
          <div className="lh-section-head lh-reveal">
            <span className="lh-section-eyebrow">Common Questions</span>
            <h2>The fine print, in plain English.</h2>
          </div>
          <div className="lh-faq lh-reveal">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`lh-faq-item${openFaq === i ? ' open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="lh-faq-q">
                  {item.q}
                  <span className="lh-faq-icon">+</span>
                </div>
                <div className="lh-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lh-cta-section">
        <div className="container">
          <h2>Start with the right module.</h2>
          <p>Take the 90-second diagnostic and we'll personalize the path. Or jump straight in — Module 01 is free either way.</p>
          <button className="lh-btn-primary" onClick={() => setDiagOpen(true)}>Find my starting point →</button>
        </div>
      </section>

      {/* ── Diagnostic Modal ── */}
      <DiagModal open={diagOpen} onClose={() => setDiagOpen(false)} onAccept={handleAcceptReco} />
    </div>
  );
}
