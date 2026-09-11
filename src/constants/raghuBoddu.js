export const LINKS = {
  sapSecurityExpert: "https://www.sapsecurityexpert.com",
  ssePodcasts: "https://sapsecurityexpert.com/podcasts",
  sseRecommendations: "https://sapsecurityexpert.com/expert-recommendations",
  sse2015Model:
    "https://sapsecurityexpert.com/expert-recommendations/sap-security-2015-model-already-behind",
  toggleNow: "https://www.togglenow.com",
  toggleNowSolutions: "https://togglenow.com/solutions/",
  automationStories: "https://togglenow.com/automation-stories/",
  sapPressAuthor: "https://blog.sap-press.com/author/raghu-boddu",
  bookProcessControl: "https://www.sap-press.com/sap-process-control_5799/",
  bookIag: "https://www.sap-press.com/introducing-sap-cloud-identity-access-governance-iag_5985/",
  bookAccessControl: "https://www.sap-press.com/en/sap-access-control-5636/",
  training: "https://www.sap-press.com/online-courses/authorizations-and-security-for-sap-s4hana/",
  linkedin: "https://www.linkedin.com/in/raghuboddu",
  sapCommunity: "https://community.sap.com/t5/user/viewprofilepage/user-id/600573",
  personalSite: "https://www.raghuboddu.com",
  agInnoLabs: "https://aginnolabs.com/",
  sakshiTv: "https://www.youtube.com/watch?v=AiGP4hL041s",
  hybizTv: "https://www.youtube.com/watch?v=Rhs66vy54OE",
  toggleNowSecOps: null,
};

export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "expertise", label: "Expertise" },
  { id: "books", label: "Books" },
  { id: "secops", label: "SecOps" },
  { id: "research", label: "Research" },
  { id: "speaking", label: "Speaking" },
  { id: "togglenow", label: "ToggleNow" },
  { id: "viewpoint", label: "Viewpoint" },
  { id: "connect", label: "Connect" },
];

export const TRUST = [
  { value: "25+ Years", label: "SAP Security • GRC • Audit • Automation" },
  { value: "SAP PRESS", label: "Published author, Rheinwerk Publishing" },
  { value: "CISA • CFE • CDPSE", label: "Audit, fraud & data privacy credentials" },
  { value: "SAP Certified", label: "SAP Certified Security Professional" },
  { value: "Founder", label: "SAP Security Expert community" },
];

export const EXPERTISE = [
  {
    n: "01",
    title: "SAP Security & Authorizations",
    summary:
      "Authorization architecture and least privilege design across SAP ECC, SAP S/4HANA and SAP Fiori landscapes.",
    topics: [
      "SAP Authorization Architecture",
      "Role design and optimization",
      "User and Identity Governance",
      "SAP S/4HANA Security",
      "Security in SAP Fiori",
      "Authorization analysis",
      "Least privilege design",
      "Non-human and technical identities",
    ],
  },
  {
    n: "02",
    title: "SAP GRC & Access Governance",
    summary:
      "Access Control SAP, risk analysis and continuous access governance built to survive audit and scale.",
    topics: [
      "Access control SAP",
      "Access Risk Analysis",
      "Segregation of Duties",
      "User Access Review",
      "Emergency Access Management",
      "Business Role Administration",
      "SAP Identity Access Governance",
      "SAP Process Control",
      "SAP Risk Management",
    ],
  },
  {
    n: "03",
    title: "SAP Security & Cyber Security",
    summary:
      "SAP cybersecurity, threat monitoring and SAP security operations connected to the enterprise SOC.",
    topics: [
      "SAP Threat Monitoring",
      "SAP security operations",
      "SAP SIEM/SOAR",
      "SAP HANA DB security",
      "Data protection",
      "Privileged access management",
      "Audit logging",
      "Continuous security monitoring",
    ],
  },
  {
    n: "04",
    title: "Security Automation & AI",
    summary:
      "Orchestrated automation with a human in the loop, and AI for SAP Security across human and non-human identities.",
    topics: [
      "SAP security automation",
      "GRC process automation",
      "AI-powered security operations",
      "SAP authorizations and AI agents",
      "Non-human identity governance",
      "Ongoing access governance",
      "Security analysis",
      "Orchestrated automation (human-in-loop)",
    ],
  },
];

export const AUDIT_MATRIX = [
  "ITGC",
  "SAP audit readiness",
  "Audit Trails (SAP)",
  "Internal controls",
  "SoD controls",
  "Compliance with Regulations",
  "Risk assessment",
  "Continuous controls oversight",
];

export const BOOKS = [
  {
    title: "SAP Access Control – Comprehensive Guide",
    description:
      "A comprehensive guide to SAP Access Control covering installation, configuration, Access Risk Analysis, Emergency Access Management, Access Request Management, Business Role Management, User Access Reviews, Segregation of Duties, BRFplus, MSMP workflows, Fiori and extensions.",
    publisher: "SAP PRESS / Rheinwerk Publishing",
    cta: "View book at SAP PRESS",
    href: LINKS.bookAccessControl,
  },
  {
    title: "SAP Process Control 12.0 – Comprehensive Guide",
    description:
      "A practical guide to SAP Process Control covering governance, configuration, master data, control evaluation, continuous controls monitoring, policy lifecycle, reporting, SAP Fiori and Financial Compliance Management.",
    publisher: "SAP PRESS / Rheinwerk Publishing",
    cta: "View book at SAP PRESS",
    href: LINKS.bookProcessControl,
  },
  {
    title: "SAP Cloud Identity Access Governance (IAG)",
    description:
      "An eBite introducing SAP Cloud Identity Access Governance (IAG) and its modules — access analysis, privileged access management, access requests, role design and integration with on-premise SAP environments.",
    publisher: "SAP PRESS / Rheinwerk Publishing",
    cta: "Read publication",
    href: LINKS.bookIag,
  },
];

export const CERTIFICATIONS = [
  { code: "CISA", name: "Certified Information Systems Auditor" },
  { code: "CFE", name: "Certified Fraud Examiner" },
  { code: "CDPSE", name: "Certified Data Privacy Solutions Engineer" },
  { code: "SAP Certified", name: "SAP Certified Security Professional" },
  { code: "SAP GRC", name: "SAP GRC Associate" },
  { code: "ITIL V3", name: "IT service management foundation" },
  { code: "PRINCE2", name: "Foundation PRINCE2" },
  { code: "Security+", name: "CompTIA Security+" },
];

export const RESEARCH_TOPICS = [
  "Evolution of SAP Security",
  "Digital access risk",
  "SAP SecOps",
  "Continuous access governance",
  "SAP security vulnerabilities",
  "Access and SoD management",
  "Modernization of SAP GRC",
  "Security in SAP",
  "Enterprise AI agent authorizations",
  "Non-human identities",
  "SAP Data Protection",
  "Audit trail and statutory requirements",
  "Security Automation",
  "Cloud-based SAP security",
];

export const ARTICLE_CATEGORIES = [
  {
    category: "SAP Security",
    description:
      "Authorization design, security assessments, security parameters, SAP S/4HANA security and modern SAP security architecture.",
  },
  {
    category: "SAP GRC",
    description:
      "Access Control, SoD, User Access Reviews, Emergency Access Management and GRC upgrade.",
  },
  {
    category: "SAP Cybersecurity",
    description:
      "Threat monitoring, data protection, security operations and the SAP threat landscape.",
  },
  {
    category: "SAP AI & Security",
    description:
      "AI agents, automation, non-human identities and the security implications of linking AI systems to enterprise applications.",
  },
  {
    category: "Audit & Compliance",
    description: "SAP audit trails, regulatory requirements, controls and readiness for audit.",
  },
];

export const PODCAST_TOPICS = [
  "Cybersecurity for SAP",
  "SAP Security Evolution",
  "GRC",
  "Security and AI",
  "Automation",
  "Risk Enterprise",
  "Leadership",
  "The future of SAP Security",
];

export const SPEAKING_CHANNELS = [
  "Industry events",
  "SAP Security community sessions",
  "Webinars",
  "Podcasts",
  "Technical discussions",
  "Professional forums",
  "LinkedIn",
  "Educational and training programs",
];

export const VIEWPOINT_QUESTIONS = [
  "Who has access to it?",
  "How do they have access to them?",
  "What business process can that access allow?",
  "What other systems are there?",
  "What was the identity doing really?",
  "Is the activity detectable?",
  "Is control on ongoing surveillance?",
  "Is there a way to automate, but keep the human accountable?",
];

export const MODERN_LANDSCAPE = [
  "Human identities",
  "Non-human identities",
  "S/4HANA",
  "Fiori",
  "APIs",
  "BTP",
  "Integrations",
  "Automation",
  "AI Agents",
];
