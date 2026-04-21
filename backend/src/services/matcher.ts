import { DOCTORS, type Doctor, type Urgency } from "../db/doctors.js";
import { HOSPITAL_TAXONOMY, getAnchorDepartment } from "../db/taxonomy.js";
import { type Message } from "../db/sessions.js";

export interface MatchCriteria {
  symptoms: string;
  language?: string;
  insurance?: string;
  urgency: Urgency;
}

export interface DoctorMatch {
  doctor: Doctor;
  score: number;
  confidencePct: number;
  matchReasons: string[];
}

/**
 * Detects urgency level based on keyword analysis.
 * Priority: Critical > High > Normal.
 */
export function detectUrgency(text: string): Urgency {
  const lower = text.toLowerCase();
  
  const criticalTerms = ["can't breathe", "unconscious", "crushing chest pain", "heavy bleeding", "stroke"];
  if (criticalTerms.some(term => lower.includes(term))) return "critical";
  
  const highTerms = ["cancer", "tumor", "persistent cough", "lump", "severe pain", "fever"];
  if (highTerms.some(term => lower.includes(term))) return "high";
  
  return "normal";
}

/**
 * Calculates a clinical score for a doctor based on weighted taxonomy and keywords.
 */
export function scoreDoctor(doctor: Doctor, criteria: MatchCriteria): number {
  let score = 0;
  const text = criteria.symptoms.toLowerCase();

  // 1. ANCHOR MATCHING: Identify the highest priority department for these symptoms
  const anchorDept = getAnchorDepartment(text);
  
  if (anchorDept && doctor.specialty === anchorDept.specialty) {
    // Boost the doctor if they belong to the highest-priority detected department
    score += anchorDept.priority;
  }

  // 2. KEYWORD HITS: Direct symptom-to-doctor keyword matching
  const keywordHits = doctor.keywords.filter(k => text.includes(k.toLowerCase())).length;
  score += (keywordHits * 10);

  // 3. EMERGENCY OVERRIDE: If urgency is critical, prioritize Emergency Specialists
  if (criteria.urgency === "critical" && doctor.emergencySpecialist) {
    score += 200;
  }

  // 4. SECONDARY PREFERENCES: Language and Insurance
  if (criteria.language && doctor.languages.includes(criteria.language)) {
    score += 15;
  }
  if (criteria.insurance && (doctor.insuranceAccepted.includes(criteria.insurance) || doctor.insuranceAccepted.includes("All insurance accepted"))) {
    score += 15;
  }

  // 5. AVAILABILITY: Small boost for immediate care
  if (doctor.nextAvailable === "immediate") score += 20;
  if (doctor.nextAvailable === "today") score += 10;

  return score;
}

function getMatchReasons(doctor: Doctor, criteria: MatchCriteria): string[] {
  const reasons: string[] = [];
  const text = criteria.symptoms.toLowerCase();

  const anchorDept = getAnchorDepartment(text);
  if (anchorDept && doctor.specialty === anchorDept.specialty) {
    reasons.push(`${doctor.specialty} specialist`);
  }

  if (doctor.keywords.some(k => text.includes(k.toLowerCase()))) {
    reasons.push("Matches your symptoms");
  }

  if (criteria.urgency === "critical" && doctor.emergencySpecialist) {
    reasons.push("Emergency specialist");
  }

  if (criteria.language && doctor.languages.includes(criteria.language)) {
    reasons.push(`Speaks ${criteria.language}`);
  }

  if (criteria.insurance && (doctor.insuranceAccepted.includes(criteria.insurance) || doctor.insuranceAccepted.includes("All insurance accepted"))) {
    reasons.push(`Accepts ${criteria.insurance}`);
  }

  if (doctor.nextAvailable === "immediate") reasons.push("Available now");
  else if (doctor.nextAvailable === "today") reasons.push("Available today");

  return reasons;
}

/**
 * Main matching engine.
 * It aggregates full session history to prevent losing context of serious conditions.
 */
export function matchDoctors(
  currentInput: string,
  history: Message[],
  preferences: { language: string; insurance: string }
): DoctorMatch[] {
  const fullSymptomContext = history
    .filter(m => m.role === "user")
    .map(m => m.content)
    .concat(currentInput)
    .join(" ");

  const urgency = detectUrgency(fullSymptomContext);

  const criteria: MatchCriteria = {
    symptoms: fullSymptomContext,
    language: preferences.language,
    insurance: preferences.insurance,
    urgency
  };

  const scored = DOCTORS
    .map(doctor => ({ doctor, score: scoreDoctor(doctor, criteria) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const maxScore = scored[0]?.score ?? 1;

  return scored.map(({ doctor, score }) => ({
    doctor,
    score,
    confidencePct: Math.min(99, Math.round((score / maxScore) * 90) + 9),
    matchReasons: getMatchReasons(doctor, criteria),
  }));
}

export { Urgency };
