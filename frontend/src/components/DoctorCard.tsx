import type { DoctorMatch, TimeSlot } from "../types/index.ts";
import { useState } from "react";
import { bookAppointment } from "../services/api.ts";
import { useNavigatorStore } from "../hooks/useNavigatorStore.ts";
import { Star, Hospital, Award, Globe, Clock, Banknote, ShieldAlert, CheckCircle2 } from "lucide-react";

interface Props {
  match: DoctorMatch;
  isFirst: boolean;
}

export function DoctorCard({ match, isFirst }: Props) {
  const { doctor, confidencePct, matchReasons } = match;
  const { sessionId } = useNavigatorStore();

  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [booking, setBooking] = useState<{ bookingId: string; slot: TimeSlot } | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleBook = async () => {
    if (!sessionId || !patientName.trim() || !patientPhone.trim()) {
      setBookingError("Please fill in all fields");
      return;
    }
    setBookingLoading(true);
    setBookingError("");
    try {
      const res = await bookAppointment({
        sessionId,
        doctorId: doctor.id,
        slotIndex: selectedSlot,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
      });
      setBooking({ bookingId: res.booking.bookingId, slot: res.booking.slot });
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className={`doctor-card ${isFirst ? "doctor-card--primary" : ""}`}>
      {isFirst && <div className="doctor-card__badge">Best match</div>}

      <div className="doctor-card__header">
        <div className="doctor-card__avatar">{doctor.initials}</div>
        <div className="doctor-card__header-info">
          <div className="doctor-card__name">{doctor.name}</div>
          <div className="doctor-card__specialty">
            {doctor.specialty} • {doctor.subspecialty}
          </div>
        </div>
        <div className="doctor-card__confidence">
          <span className="confidence-num">{confidencePct}%</span>
          <span className="confidence-label">match</span>
        </div>
      </div>

      {!booking ? (
        <>
          {!showBooking ? (
            <>
              <div className="doctor-card__grid">
                <div className="doc-stat">
                  <span className="doc-stat__label"><Clock size={12}/> Available</span>
                  <span className="doc-stat__value doc-stat__value--avail">
                    {doctor.availableSlots[0]?.label ?? "Call to book"}
                  </span>
                </div>
                <div className="doc-stat">
                  <span className="doc-stat__label"><Star size={12}/> Rating</span>
                  <span className="doc-stat__value">
                    {doctor.rating} ({doctor.reviewCount})
                  </span>
                </div>
                <div className="doc-stat">
                  <span className="doc-stat__label"><Award size={12}/> Experience</span>
                  <span className="doc-stat__value">{doctor.yearsExperience} yrs</span>
                </div>
                <div className="doc-stat">
                  <span className="doc-stat__label"><Hospital size={12}/> Hospital</span>
                  <span className="doc-stat__value">{doctor.hospital}</span>
                </div>
                <div className="doc-stat">
                  <span className="doc-stat__label"><Globe size={12}/> Languages</span>
                  <span className="doc-stat__value">{doctor.languages.join(", ")}</span>
                </div>
                <div className="doc-stat">
                  <span className="doc-stat__label"><Banknote size={12}/> Fees</span>
                  <span className="doc-stat__value">
                    {doctor.consultationFee === 0 ? "No fee" : `₹${doctor.consultationFee}`}
                  </span>
                </div>
              </div>

              {matchReasons.length > 0 && (
                <div className="doctor-card__reasons">
                  {matchReasons.map((r) => (
                    <span key={r} className="reason-tag">{r}</span>
                  ))}
                </div>
              )}

              <div className="doctor-card__actions">
                <button
                  className="btn btn--primary"
                  onClick={() => setShowBooking(true)}
                >
                  Book appointment
                </button>
                {doctor.emergencySpecialist && (
                  <button className="btn btn--danger">
                    <ShieldAlert size={16} style={{marginRight: '4px'}}/> Escalate to ER
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="booking-form" style={{marginTop: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px'}}>
              <div className="booking-form__title" style={{fontWeight: 700, marginBottom: '10px'}}>Confirm Appointment</div>

              <div className="form-group" style={{marginBottom: '10px'}}>
                <label className="doc-stat__label">Select slot</label>
                <select
                  className="form-select"
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(Number(e.target.value))}
                >
                  {doctor.availableSlots.map((slot, i) => (
                    <option key={i} value={i}>{slot.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{marginBottom: '10px'}}>
                <input
                  className="form-input"
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                  type="text"
                  placeholder="Your Full Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{marginBottom: '10px'}}>
                <input
                  className="form-input"
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                  type="tel"
                  placeholder="Phone Number"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                />
              </div>

              {bookingError && <div style={{color: '#dc2626', fontSize: '12px', marginBottom: '10px'}}>{bookingError}</div>}

              <div className="doctor-card__actions">
                <button
                  className="btn btn--primary"
                  onClick={handleBook}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Booking..." : "Confirm"}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setShowBooking(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="booking-confirm" style={{textAlign: 'center', padding: '20px'}}>
          <CheckCircle2 size={40} color="#059669" style={{marginBottom: '10px'}}/>
          <div style={{fontWeight: 700, color: '#059669'}}>Appointment Confirmed</div>
          <div style={{fontSize: '14px', margin: '5px 0'}}>{booking.slot.label}</div>
          <div style={{fontSize: '11px', color: '#64748b'}}>Ref: {booking.bookingId.slice(0, 8).toUpperCase()}</div>
        </div>
      )}
    </div>
  );
}