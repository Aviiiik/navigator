export type Gender = "M" | "F";
export type Urgency = "normal" | "high" | "critical";
export type Availability = "immediate" | "today" | "tomorrow" | "this_week";

export interface TimeSlot {
  date: string;       // ISO date string
  time: string;       // "HH:MM"
  label: string;      // human-friendly e.g. "Today, 2:30 PM"
}

export interface Doctor {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  subspecialty: string;
  gender: Gender;
  languages: string[];
  insuranceAccepted: string[];
  availableSlots: TimeSlot[];
  nextAvailable: Availability;
  rating: number;           // 1–5
  reviewCount: number;
  yearsExperience: number;
  qualifications: string[];
  hospital: string;
  department: string;
  keywords: string[];       // symptom/condition keywords for scoring
  urgencyCapable: boolean;  // can handle high/critical cases
  emergencySpecialist: boolean;
  bio: string;
  consultationFee: number;  // INR
  acceptsWalkIn: boolean;
}

// ---------------------------------------------------------------------------
// Hardcoded doctor database — replace with DB queries in production
// ---------------------------------------------------------------------------

export const DOCTORS: Doctor[] = [
  {
    id: "dr-001",
    name: "Dr. Priya Sharma",
    initials: "PS",
    specialty: "General Surgery",
    subspecialty: "GI & Abdominal Surgery",
    gender: "F",
    languages: ["English", "Hindi", "Bengali"],
    insuranceAccepted: ["Star Health", "HDFC ERGO", "CGHS", "Self-pay"],
    availableSlots: [
      { date: new Date().toISOString().split("T")[0], time: "14:30", label: "Today, 2:30 PM" },
      { date: new Date().toISOString().split("T")[0], time: "17:00", label: "Today, 5:00 PM" },
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "10:00",
        label: "Tomorrow, 10:00 AM",
      },
    ],
    nextAvailable: "today",
    rating: 4.8,
    reviewCount: 142,
    yearsExperience: 14,
    qualifications: ["MS (Surgery)", "FRCS", "FIAGES"],
    hospital: "Apollo Gleneagles Hospital",
    department: "Surgical Sciences",
    keywords: [
      "abdominal", "abdomen", "stomach", "pain", "appendix", "appendicitis",
      "hernia", "bowel", "intestine", "right side", "lower right", "nausea",
      "vomiting", "gallbladder", "gallstone", "bile", "colon", "rectal",
    ],
    urgencyCapable: true,
    emergencySpecialist: false,
    bio: "Dr. Sharma specializes in minimally invasive abdominal surgery with over 2,000 laparoscopic procedures. She leads the GI Surgery unit at Apollo Gleneagles.",
    consultationFee: 1200,
    acceptsWalkIn: false,
  },
  {
    id: "dr-002",
    name: "Dr. Arjun Mehta",
    initials: "AM",
    specialty: "Cardiology",
    subspecialty: "Interventional Cardiology",
    gender: "M",
    languages: ["English", "Hindi", "Bengali"],
    insuranceAccepted: ["CGHS", "Star Health", "Niva Bupa", "HDFC ERGO", "Self-pay"],
    availableSlots: [
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "10:00",
        label: "Tomorrow, 10:00 AM",
      },
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "15:30",
        label: "Tomorrow, 3:30 PM",
      },
    ],
    nextAvailable: "tomorrow",
    rating: 4.9,
    reviewCount: 231,
    yearsExperience: 18,
    qualifications: ["DM (Cardiology)", "FESC", "FACC"],
    hospital: "Fortis Hospital",
    department: "Cardiology & Cardiac Sciences",
    keywords: [
      "chest", "heart", "cardiac", "shortness of breath", "breathless",
      "palpitation", "palpitations", "blood pressure", "hypertension",
      "angina", "ECG", "irregular heartbeat", "tightness", "pressure",
      "radiating", "left arm", "jaw pain", "sweating", "fatigue",
    ],
    urgencyCapable: true,
    emergencySpecialist: false,
    bio: "Dr. Mehta is a top-ranked interventional cardiologist with expertise in complex coronary interventions and structural heart disease.",
    consultationFee: 1500,
    acceptsWalkIn: false,
  },
  {
    id: "dr-003",
    name: "Dr. Sneha Roy",
    initials: "SR",
    specialty: "Neurology",
    subspecialty: "Headache & Migraine Medicine",
    gender: "F",
    languages: ["English", "Bengali"],
    insuranceAccepted: ["HDFC ERGO", "Niva Bupa", "Self-pay"],
    availableSlots: [
      { date: new Date().toISOString().split("T")[0], time: "17:00", label: "Today, 5:00 PM" },
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "11:00",
        label: "Tomorrow, 11:00 AM",
      },
    ],
    nextAvailable: "today",
    rating: 4.7,
    reviewCount: 98,
    yearsExperience: 10,
    qualifications: ["DM (Neurology)", "PDF (Headache Medicine, Mayo Clinic)"],
    hospital: "AMRI Hospitals",
    department: "Neurosciences",
    keywords: [
      "headache", "migraine", "head pain", "vision", "blurred vision",
      "dizziness", "vertigo", "numbness", "tingling", "seizure", "epilepsy",
      "memory", "confusion", "weakness", "tremor", "balance", "coordination",
      "neurological", "stroke", "TIA",
    ],
    urgencyCapable: true,
    emergencySpecialist: false,
    bio: "Dr. Roy is a specialist in headache disorders and neurovascular conditions, trained at Mayo Clinic. She runs a dedicated headache clinic.",
    consultationFee: 1000,
    acceptsWalkIn: false,
  },
  {
    id: "dr-004",
    name: "Dr. Vikram Patel",
    initials: "VP",
    specialty: "Orthopedics",
    subspecialty: "Sports Medicine & Joint Reconstruction",
    gender: "M",
    languages: ["English", "Hindi", "Gujarati"],
    insuranceAccepted: ["Star Health", "CGHS", "HDFC ERGO", "Self-pay"],
    availableSlots: [
      { date: new Date().toISOString().split("T")[0], time: "15:45", label: "Today, 3:45 PM" },
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "09:30",
        label: "Tomorrow, 9:30 AM",
      },
    ],
    nextAvailable: "today",
    rating: 4.6,
    reviewCount: 187,
    yearsExperience: 12,
    qualifications: ["MS (Ortho)", "MCh (Joint Reconstruction)", "FASM"],
    hospital: "Medica Superspecialty Hospital",
    department: "Orthopedics & Sports Medicine",
    keywords: [
      "knee", "knee pain", "joint", "joints", "bone", "fracture", "broken",
      "sports", "injury", "sprain", "ligament", "ACL", "meniscus",
      "shoulder", "hip", "back pain", "spine", "disc", "slip disc",
      "swelling", "stiffness", "arthritis", "cartilage",
    ],
    urgencyCapable: true,
    emergencySpecialist: false,
    bio: "Dr. Patel is a fellowship-trained joint reconstruction and sports medicine surgeon, having operated on professional athletes across India.",
    consultationFee: 1100,
    acceptsWalkIn: true,
  },
  {
    id: "dr-005",
    name: "Dr. Amina Khan",
    initials: "AK",
    specialty: "Endocrinology",
    subspecialty: "Diabetes & Thyroid Disorders",
    gender: "F",
    languages: ["English", "Bengali", "Hindi", "Urdu"],
    insuranceAccepted: ["HDFC ERGO", "Star Health", "Niva Bupa", "CGHS", "Self-pay"],
    availableSlots: [
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "11:30",
        label: "Tomorrow, 11:30 AM",
      },
      {
        date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
        time: "14:00",
        label: "Day after, 2:00 PM",
      },
    ],
    nextAvailable: "tomorrow",
    rating: 4.8,
    reviewCount: 163,
    yearsExperience: 11,
    qualifications: ["DM (Endocrinology)", "FRCP (London)", "CDE"],
    hospital: "Ruby General Hospital",
    department: "Endocrinology & Metabolism",
    keywords: [
      "diabetes", "diabetic", "HbA1c", "blood sugar", "sugar", "insulin",
      "thyroid", "hypothyroid", "hyperthyroid", "TSH", "T3", "T4",
      "weight gain", "weight loss", "fatigue", "hormones", "hormone",
      "PCOS", "polycystic", "Cushing", "Addison", "adrenal",
    ],
    urgencyCapable: false,
    emergencySpecialist: false,
    bio: "Dr. Khan is a consultant endocrinologist with special expertise in complex diabetes management and thyroid malignancy.",
    consultationFee: 1300,
    acceptsWalkIn: false,
  },
  {
    id: "dr-006",
    name: "Dr. Rajesh Nair",
    initials: "RN",
    specialty: "Emergency Medicine",
    subspecialty: "Acute & Trauma Care",
    gender: "M",
    languages: ["English", "Hindi", "Malayalam"],
    insuranceAccepted: [
      "Star Health", "HDFC ERGO", "Niva Bupa", "CGHS", "Self-pay", "All insurance accepted",
    ],
    availableSlots: [
      { date: new Date().toISOString().split("T")[0], time: "00:00", label: "Immediate" },
    ],
    nextAvailable: "immediate",
    rating: 4.9,
    reviewCount: 412,
    yearsExperience: 16,
    qualifications: ["MD (Emergency Medicine)", "FCEM", "ATLS Instructor"],
    hospital: "Apollo Gleneagles Hospital",
    department: "Emergency & Trauma",
    keywords: [
      "severe", "emergency", "acute", "sudden", "trauma", "accident",
      "unconscious", "unresponsive", "breathing", "cant breathe",
      "can't breathe", "crushing", "worst", "dying", "faint", "collapse",
    ],
    urgencyCapable: true,
    emergencySpecialist: true,
    bio: "Dr. Nair heads the 24/7 Emergency & Trauma unit. He is an ATLS instructor and has managed over 10,000 emergency cases.",
    consultationFee: 0,
    acceptsWalkIn: true,
  },
  {
    id: "dr-007",
    name: "Dr. Meera Iyer",
    initials: "MI",
    specialty: "Pulmonology",
    subspecialty: "Respiratory & Sleep Medicine",
    gender: "F",
    languages: ["English", "Tamil", "Hindi"],
    insuranceAccepted: ["Star Health", "Niva Bupa", "HDFC ERGO", "Self-pay"],
    availableSlots: [
      { date: new Date().toISOString().split("T")[0], time: "16:00", label: "Today, 4:00 PM" },
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "12:00",
        label: "Tomorrow, 12:00 PM",
      },
    ],
    nextAvailable: "today",
    rating: 4.7,
    reviewCount: 117,
    yearsExperience: 9,
    qualifications: ["DM (Pulmonology)", "PDF (Sleep Medicine)", "FCCP"],
    hospital: "Peerless Hospital",
    department: "Pulmonology & Critical Care",
    keywords: [
      "breathing", "breathless", "shortness of breath", "cough", "chronic cough",
      "asthma", "COPD", "lung", "wheeze", "wheezing", "sleep apnea",
      "snoring", "TB", "tuberculosis", "pneumonia", "bronchitis",
      "oxygen", "sputum", "respiratory",
    ],
    urgencyCapable: true,
    emergencySpecialist: false,
    bio: "Dr. Iyer is a leading pulmonologist with a subspecialty in sleep-disordered breathing and asthma management.",
    consultationFee: 900,
    acceptsWalkIn: false,
  },
  {
    id: "dr-008",
    name: "Dr. Saurav Das",
    initials: "SD",
    specialty: "Gastroenterology",
    subspecialty: "Hepatology & IBD",
    gender: "M",
    languages: ["English", "Bengali", "Hindi"],
    insuranceAccepted: ["CGHS", "Star Health", "HDFC ERGO", "Niva Bupa", "Self-pay"],
    availableSlots: [
      {
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "09:00",
        label: "Tomorrow, 9:00 AM",
      },
    ],
    nextAvailable: "tomorrow",
    rating: 4.8,
    reviewCount: 204,
    yearsExperience: 15,
    qualifications: ["DM (Gastroenterology)", "MRCP (UK)", "FASGE"],
    hospital: "Belle Vue Clinic",
    department: "Gastroenterology & Hepatology",
    keywords: [
      "acidity", "acid reflux", "GERD", "gastric", "ulcer", "liver",
      "hepatitis", "jaundice", "yellow eyes", "yellow skin",
      "IBD", "Crohn", "colitis", "diarrhea", "constipation",
      "bloating", "stomach pain", "abdominal", "endoscopy", "colonoscopy",
    ],
    urgencyCapable: false,
    emergencySpecialist: false,
    bio: "Dr. Das is a senior gastroenterologist with deep expertise in inflammatory bowel disease and advanced endoscopic procedures.",
    consultationFee: 1400,
    acceptsWalkIn: false,
  },
];

// ---------------------------------------------------------------------------
// In-memory lookup maps — O(1) access
// ---------------------------------------------------------------------------

export const DOCTOR_BY_ID = new Map<string, Doctor>(DOCTORS.map((d) => [d.id, d]));
