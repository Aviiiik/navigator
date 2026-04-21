/**
 * CLINICAL TAXONOMY CONFIGURATION
 * This structure allows the Navigator to rank specialties based on clinical severity.
 * Anchors (Priority > 80) will maintain dominance in the conversation even if 
 * minor symptoms are mentioned later.
 */

export interface DepartmentConfig {
  specialty: string;
  priority: number; // 0-100: Higher scores anchor the conversation
  keywords: string[];
  isSurgical: boolean;
}

export const HOSPITAL_TAXONOMY: DepartmentConfig[] = [
  // --- HIGH PRIORITY / ANCHOR DEPARTMENTS ---
  {
    specialty: "Emergency Medicine",
    priority: 100,
    keywords: ["emergency", "unconscious", "accident", "trauma", "bleeding", "poisoning", "choking", "unresponsive", "severe pain"],
    isSurgical: false
  },
  {
    specialty: "Oncology",
    priority: 95,
    keywords: ["cancer", "tumor", "lump", "mass", "malignant", "biopsy", "chemotherapy", "radiation", "oncologist", "metastasis"],
    isSurgical: false
  },
  {
    specialty: "Cardiology",
    priority: 90,
    keywords: ["heart", "chest pain", "palpitations", "arrhythmia", "cardiac", "stent", "angina", "heart attack", "shortness of breath"],
    isSurgical: false
  },
  {
    specialty: "Neurology",
    priority: 85,
    keywords: ["stroke", "seizure", "paralysis", "migraine", "tremor", "numbness", "memory loss", "brain", "vertigo", "concussion"],
    isSurgical: false
  },

  // --- SPECIALIZED DEPARTMENTS ---
  {
    specialty: "Pulmonology",
    priority: 80,
    keywords: ["lung", "breathing", "asthma", "COPD", "pneumonia", "chronic cough", "bronchitis", "wheezing", "tuberculosis"],
    isSurgical: false
  },
  {
    specialty: "Nephrology",
    priority: 75,
    keywords: ["kidney", "dialysis", "renal", "creatinine", "urine", "proteinuria", "kidney stone"],
    isSurgical: false
  },
  {
    specialty: "Gastroenterology",
    priority: 70,
    keywords: ["stomach", "liver", "digestion", "acid reflux", "jaundice", "colonoscopy", "gastric", "ulcer", "bloating"],
    isSurgical: false
  },
  {
    specialty: "Endocrinology",
    priority: 65,
    keywords: ["diabetes", "thyroid", "hormone", "insulin", "pcos", "metabolism", "hyperthyroid"],
    isSurgical: false
  },
  {
    specialty: "Obstetrics & Gynecology",
    priority: 65,
    keywords: ["pregnancy", "pregnant", "period", "menstrual", "fertility", "uterus", "ovary", "gynecology"],
    isSurgical: true
  },

  // --- SURGICAL & ORTHOPEDIC ---
  {
    specialty: "General Surgery",
    priority: 60,
    keywords: ["appendix", "hernia", "gallbladder", "surgery", "biopsy", "incision", "abdominal pain"],
    isSurgical: true
  },
  {
    specialty: "Orthopedics",
    priority: 55,
    keywords: ["bone", "fracture", "joint", "knee pain", "spine", "back pain", "ligament", "sprain", "arthritis"],
    isSurgical: true
  },
  {
    specialty: "Urology",
    priority: 50,
    keywords: ["prostate", "bladder", "urinary", "kidney stone", "erectile", "incontinence"],
    isSurgical: true
  },

  // --- GENERAL CARE ---
  {
    specialty: "Dermatology",
    priority: 40,
    keywords: ["skin", "rash", "itching", "acne", "eczema", "psoriasis", "mole", "fungal"],
    isSurgical: false
  },
  {
    specialty: "ENT",
    priority: 40,
    keywords: ["ear", "nose", "throat", "sinus", "tonsils", "hearing", "tinnitus", "snoring"],
    isSurgical: true
  },
  {
    specialty: "Psychiatry",
    priority: 30,
    keywords: ["anxiety", "depression", "stress", "mental health", "panic", "bipolar", "insomnia", "suicidal"],
    isSurgical: false
  }
];

/**
 * HELPER: Find highest priority department based on symptoms
 */
export function getAnchorDepartment(symptoms: string): DepartmentConfig | undefined {
  const text = symptoms.toLowerCase();
  return HOSPITAL_TAXONOMY
    .filter(dept => dept.keywords.some(k => text.includes(k.toLowerCase())))
    .sort((a, b) => b.priority - a.priority)[0];
}