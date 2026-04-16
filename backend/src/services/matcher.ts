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

// Critical: Life-threatening symptoms requiring immediate ER intervention
const URGENCY_CRITICAL_TERMS = new Set([
  "severe", "worst", "crushing", "cant breathe", "can't breathe",
  "unconscious", "unresponsive", "emergency", "dying", "collapse", "faint",
  "radiating", "sudden onset", "heart attack", "choking", "blue lips", 
  "coughing blood", "gasping"
]);

// High: Serious conditions like potential oncology or chronic respiratory issues
const URGENCY_HIGH_TERMS = new Set([
  "sudden", "worse", "sharp", "unbearable", "fever", "vomiting", 
  "bleeding", "getting worse", "shortness of breath", "chest pain", 
  "lump", "tumor", "weight loss", "persistent cough", "smoker", "biopsy",
  "mass", "night sweats", "wheezing", "labored breathing"
]);

/**
 * Detects urgency level based on keyword analysis of user input.
 */
export function detectUrgency(text: string): Urgency {
  const lower = text.toLowerCase();
  
  // Check for critical respiratory or cardiac distress first
  for (const term of URGENCY_CRITICAL_TERMS) {
    if (lower.includes(term)) return "critical";
  }
  
  // Check for high-risk flags (Oncology/Pulmonology indicators)
  for (const term of URGENCY_HIGH_TERMS) {
    if (lower.includes(term)) return "high";
  }
  
  return "normal";
}

/**
 * Scores a doctor against patient criteria with heavy weighting for 
 * specialized disease categories.
 */
export function scoreDoctor(doctor: Doctor, criteria: MatchCriteria): DoctorMatch {
  let score = 0;
  const reasons: string[] = [];
  const text = criteria.symptoms.toLowerCase();

  // --- Specialized Disease Detection ---
  const isOncologyCase = /lump|tumor|cancer|mass|biopsy|oncology/i.test(text);
  const isPulmonaryCase = /lung|breathing|cough|breath|pulmonary|wheezing/i.test(text);

  // Boost specialists for detected complex conditions
  if (isOncologyCase && doctor.specialty === "Oncology") {
    score += 45;
    reasons.push("Oncology specialist for detected mass/tumor flags");
  }
  if (isPulmonaryCase && doctor.specialty === "Pulmonology") {
    score += 45;
    reasons.push("Pulmonology specialist for respiratory symptoms");
  }

  // --- Keyword match (max 40 pts) ---
  let keywordHits = 0;
  for (const keyword of doctor.keywords) {
    if (text.includes(keyword.toLowerCase())) keywordHits++;
  }
  if (keywordHits > 0) {
    const keywordScore = Math.min(keywordHits * 10, 40);
    score += keywordScore;
    reasons.push(`Matches ${keywordHits} symptom-specific keyword${keywordHits > 1 ? "s" : ""}`);
  }

  // --- Emergency escalation (critical urgency) ---
  if (criteria.urgency === "critical" && doctor.emergencySpecialist) {
    score += 60;
    reasons.push("Emergency specialist — recommended for critical distress");
  }

  // --- Secondary Criteria (Language/Insurance) ---
  if (criteria.language && doctor.languages.includes(criteria.language)) {
    score += 10;
    reasons.push(`Speaks ${criteria.language}`);
  }

  if (criteria.insurance) {
    const insMatch =
      doctor.insuranceAccepted.includes(criteria.insurance) ||
      doctor.insuranceAccepted.includes("All insurance accepted");
    if (insMatch) {
      score += 10;
      reasons.push(`Accepts ${criteria.insurance}`);
    }
  }

  // --- Availability bonus ---
  if (doctor.nextAvailable === "immediate") {
    score += 15;
    reasons.push("Immediate availability");
  } else if (doctor.nextAvailable === "today") {
    score += 5;
    reasons.push("Available today");
  }

  // --- Final Normalization ---
  // Clamp score between 0-100 and ensure display percentage looks realistic
  const finalScore = Math.max(0, Math.min(score, 100));
  const confidencePct = Math.max(15, Math.min(99, finalScore));

  return { doctor, score: finalScore, matchReasons: reasons, confidencePct };
}

/**
 * Matches doctors based on criteria, prioritizing emergency specialists 
 * during critical urgency.
 */
export function matchDoctors(criteria: MatchCriteria, limit = 3): DoctorMatch[] {
  const urgency = criteria.urgency;

  const scored = DOCTORS
    .map((d) => scoreDoctor(d, criteria))
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      // Force Emergency Medicine to the top for critical cases
      if (urgency === "critical") {
        if (a.doctor.emergencySpecialist && !b.doctor.emergencySpecialist) return -1;
        if (!a.doctor.emergencySpecialist && b.doctor.emergencySpecialist) return 1;
      }
      return b.score - a.score;
    });

  // Fallback: If no matches found, return the most relevant default
  if (scored.length === 0) {
    const fallback = urgency === "critical"
      ? DOCTORS.find((d) => d.emergencySpecialist)!
      : DOCTORS[0];
    return [scoreDoctor(fallback, criteria)];
  }

  return scored.slice(0, limit);
}