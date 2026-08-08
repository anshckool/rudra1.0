// risk-patterns.js
// Heuristic keyword/regex library used to flag risky clauses in T&Cs,
// privacy policies, and cookie-consent text. Runs 100% locally — no
// network calls, no data leaves the browser.

const RISK_PATTERNS = [
  {
    id: "sell-data",
    label: "May sell or share your personal data with third parties",
    severity: 3,
    regex: /(sell|rent|share|disclose|transfer).{0,10}(your |the )?(personal (information|data)|user data|your data).{0,20}(third[- ]part|partner|advertiser|affiliate)/i
  },
  {
    id: "arbitration",
    label: "Forces arbitration and/or waives your right to a class action or jury trial",
    severity: 3,
    regex: /(binding arbitration|waive.{0,15}(right to|class action)|class action waiver|jury trial)/i
  },
  {
    id: "unilateral-changes",
    label: "Can change the terms at any time without directly notifying you",
    severity: 2,
    regex: /(we (may|reserve the right to) (change|modify|update|amend).{0,30}(these terms|this (agreement|policy)|at any time))|(without (prior )?notice)/i
  },
  {
    id: "broad-license",
    label: "Takes a broad, perpetual license to anything you upload or post",
    severity: 3,
    regex: /(perpetual|irrevocable|royalty[- ]free|sublicensable|worldwide license).{0,60}(content|material|post|submission)/i
  },
  {
    id: "auto-renew",
    label: "Auto-renews or auto-charges your payment method",
    severity: 2,
    regex: /(automatically renew|auto[- ]renew|recurring (charge|billing|payment)|will be (automatically )?charged)/i
  },
  {
    id: "no-warranty",
    label: "Disclaims essentially all liability and warranties (\"as is\")",
    severity: 1,
    regex: /(as is.{0,10}and.{0,10}as available|no warrant(y|ies)|limitation of liability|not liable for any (indirect|damages))/i
  },
  {
    id: "indefinite-retention",
    label: "May retain your data indefinitely, even after you delete your account",
    severity: 2,
    regex: /(retain.{0,40}(data|information).{0,30}(indefinitely|as long as necessary))|(even after.{0,20}(delete|terminat|close).{0,20}account)/i
  },
  {
    id: "tracking",
    label: "Tracks you across other sites/apps or uses device fingerprinting",
    severity: 2,
    regex: /(cross[- ]device tracking|fingerprint(ing)?|track(s|ing)? you across|third[- ]party (cookies|trackers|analytics))/i
  },
  {
    id: "law-enforcement",
    label: "May share data with law enforcement or government without notifying you",
    severity: 2,
    regex: /(disclose.{0,40}(law enforcement|government|legal (request|authorities)))/i
  },
  {
    id: "no-refunds",
    label: "States that purchases are non-refundable",
    severity: 1,
    regex: /(non[- ]refundable|no refunds?( will be (given|issued|provided))?)/i
  },
  {
    id: "minors-data",
    label: "Mentions collecting data from children/minors",
    severity: 2,
    regex: /(children under (the age of )?1[0-9]|collect.{0,30}(information|data).{0,20}(child|minor))/i
  },
  {
    id: "location-tracking",
    label: "Collects precise location data",
    severity: 1,
    regex: /(precise|real[- ]time) location|geolocation data|track(s|ing)? your location/i
  },
  {
    id: "ad-cookies",
    label: "Uses cookies for targeted/personalized advertising",
    severity: 1,
    regex: /(personalize|targeted) advert|advertising cookies|ad(s)? tailored to you/i
  },
  {
    id: "terminate-anytime",
    label: "Can suspend or terminate your account at their sole discretion",
    severity: 1,
    regex: /(sole discretion).{0,30}(terminat|suspend)|(terminat|suspend).{0,30}(sole discretion)/i
  },
  {
    id: "jurisdiction",
    label: "Governing law/jurisdiction may be far from you, limiting local consumer protections",
    severity: 1,
    regex: /(governed by the laws of|exclusive jurisdiction of the courts)/i
  }
];

if (typeof module !== "undefined") {
  module.exports = RISK_PATTERNS;
}
