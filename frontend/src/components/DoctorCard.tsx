import type { DoctorMatch, TimeSlot } from "../types/index.ts";
import { useState } from "react";
import { bookAppointment } from "../services/api.ts";
import { useNavigatorStore } from "../hooks/useNavigatorStore.ts";

interface Props {
  match: DoctorMatch;
  isFirst: boolean;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < Math.round(rating) ? "#d97706" : "#d1d5db" }}>
          ★
        </span>
      ))}
    </span>
  );
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
            {doctor.specialty} · {doctor.subspecialty}
          </div>
        </div>
        <div className="doctor-card__confidence">
          <span className="confidence-num">{confidencePct}%</span>
          <span className="confidence-label">match</span>
        </div>
      </div>

      <div className="doctor-card__bar-row">
        <div className="confidence-bar">
          <div
            className="confidence-bar__fill"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      <div className="doctor-card__grid">
        <div className="doc-stat">
          <span className="doc-stat__label">Next available</span>
          <span className="doc-stat__value doc-stat__value--avail">
            {doctor.availableSlots[0]?.label ?? "Call to book"}
          </span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat__label">Rating</span>
          <span className="doc-stat__value">
            <Stars rating={doctor.rating} /> {doctor.rating} ({doctor.reviewCount})
          </span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat__label">Languages</span>
          <span className="doc-stat__value">{doctor.languages.join(", ")}</span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat__label">Experience</span>
          <span className="doc-stat__value">{doctor.yearsExperience} yrs</span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat__label">Hospital</span>
          <span className="doc-stat__value">{doctor.hospital}</span>
        </div>
        <div className="doc-stat">
          <span className="doc-stat__label">Fees</span>
          <span className="doc-stat__value">
            {doctor.consultationFee === 0 ? "Emergency — no fee" : `₹${doctor.consultationFee}`}
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

      {!booking ? (
        <>
          {!showBooking ? (
            <div className="doctor-card__actions">
              <button
                className="btn btn--primary"
                onClick={() => setShowBooking(true)}
              >
                Book appointment
              </button>
              {doctor.emergencySpecialist && (
                <button className="btn btn--danger">Escalate to ER</button>
              )}
              {!doctor.emergencySpecialist && (
                <button className="btn btn--ghost">View profile</button>
              )}
            </div>
          ) : (
            <div className="booking-form">
              <div className="booking-form__title">Confirm booking</div>

              <div className="form-group">
                <label className="form-label">Select slot</label>
                <select
                  className="form-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(Number(e.target.value))}
                >
                  {doctor.availableSlots.map((slot, i) => (
                    <option key={i} value={i}>{slot.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Your name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Full name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                />
              </div>

              {bookingError && <div className="booking-error">{bookingError}</div>}

              <div className="doctor-card__actions">
                <button
                  className="btn btn--primary"
                  onClick={handleBook}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Booking…" : "Confirm"}
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
        <div className="booking-confirm">
          <div className="booking-confirm__icon">✓</div>
          <div className="booking-confirm__title">Appointment confirmed</div>
          <div className="booking-confirm__slot">{booking.slot.label}</div>
          <div className="booking-confirm__id">Ref: {booking.bookingId.slice(0, 8).toUpperCase()}</div>
          <div className="booking-confirm__note">
            Bring your insurance card and a photo ID. Arrive 15 min early.
          </div>
        </div>
      )}
    </div>
  );
}
