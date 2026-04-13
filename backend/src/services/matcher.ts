import { DOCTORS, type Doctor, type Urgency } from "../db/doctors.js";

export interface MatchCriteria {
  symptoms: string;
  language?: string;
  insurance?: string;
  genderPreference?: string;
  urgency: Urgency;
}

export interface DoctorMatch {
  doctor: Doctor;
  score: number;          // 0–100
  matchReasons: string[];
  confidencePct: number;  // display-safe 0–100
}

const URGENCY_CRITICAL_TERMS = new Set([
  "severe", "worst", "crushing", "cant breathe", "can't breathe",
  "unconscious", "unresponsive", "emergency", "dying", "collapse", "faint",
  "radiating", "sudden onset", "heart attack",
]);

const URGENCY_HIGH_TERMS = new Set([
  "sudden", "worse", "sharp", "unbearable", "2 days", "3 days",
  "fever", "vomiting", "bleeding", "getting worse",
]);

export function detectUrgency(text: string): Urgency {
  const lower = text.toLowerCase();
  for (const term of URGENCY_CRITICAL_TERMS) {
    if (lower.includes(term)) return "critical";
  }
  for (const term of URGENCY_HIGH_TERMS) {
    if (lower.includes(term)) return "high";
  }
  return "normal";
}

export function scoreDoctor(doctor: Doctor, criteria: MatchCriteria): DoctorMatch {
  let score = 0;
  const reasons: string[] = [];
  const text = criteria.symptoms.toLowerCase();

  // --- Keyword match (max 50 pts) ---
  let keywordHits = 0;
  for (const keyword of doctor.keywords) {
    if (text.includes(keyword.toLowerCase())) keywordHits++;
  }
  if (keywordHits > 0) {
    const keywordScore = Math.min(keywordHits * 8, 50);
    score += keywordScore;
    reasons.push(`Matches ${keywordHits} symptom keyword${keywordHits > 1 ? "s" : ""}`);
  }

  // --- Emergency escalation (critical urgency → always surface emergency specialist) ---
  if (criteria.urgency === "critical" && doctor.emergencySpecialist) {
    score += 60;
    reasons.push("Emergency specialist — critical case");
  }

  // --- Language match (10 pts) ---
  if (criteria.language && doctor.languages.includes(criteria.language)) {
    score += 10;
    reasons.push(`Speaks ${criteria.language}`);
  }

  // --- Insurance match (10 pts) ---
  if (criteria.insurance) {
    const insMatch =
      doctor.insuranceAccepted.includes(criteria.insurance) ||
      doctor.insuranceAccepted.includes("All insurance accepted");
    if (insMatch) {
      score += 10;
      reasons.push(`Accepts ${criteria.insurance}`);
    }
  }

  // --- Gender preference (5 pts) ---
  if (criteria.genderPreference && doctor.gender === criteria.genderPreference) {
    score += 5;
    reasons.push("Matches gender preference");
  }

  // --- Availability bonus ---
  if (doctor.nextAvailable === "immediate") {
    score += 10;
    reasons.push("Immediate availability");
  } else if (doctor.nextAvailable === "today") {
    score += 5;
    reasons.push("Available today");
  }

  // --- Rating bonus (up to 5 pts) ---
  score += Math.round((doctor.rating - 4) * 10);

  const finalScore = Math.max(0, Math.min(score, 100));
  const confidencePct = Math.max(10, Math.min(99, finalScore));

  return { doctor, score: finalScore, matchReasons: reasons, confidencePct };
}

export function matchDoctors(criteria: MatchCriteria, limit = 3): DoctorMatch[] {
  const urgency = criteria.urgency;

  let pool = DOCTORS;

  // For critical urgency, always put emergency specialists at top
  const scored = pool
    .map((d) => scoreDoctor(d, criteria))
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      // Emergency specialist always first for critical
      if (urgency === "critical") {
        if (a.doctor.emergencySpecialist && !b.doctor.emergencySpecialist) return -1;
        if (!a.doctor.emergencySpecialist && b.doctor.emergencySpecialist) return 1;
      }
      return b.score - a.score;
    });

  // Ensure at least one result even with no keyword match
  if (scored.length === 0) {
    const fallback = urgency === "critical"
      ? DOCTORS.find((d) => d.emergencySpecialist)!
      : DOCTORS[0];
    return [scoreDoctor(fallback, criteria)];
  }

  return scored.slice(0, limit);
}
