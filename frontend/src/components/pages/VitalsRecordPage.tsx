import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Droplets,
  Heart,
  HeartPulse,
  Info,
  ScanLine,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import api from '../../shared/services/api';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { useAuthStore } from '../../store/authStore';
import './FaceVitals.css';

type VitalId = 'blood-pressure' | 'blood-sugar' | 'pulse-rate' | 'heart-rate';

interface VitalGuide {
  id: VitalId;
  title: string;
  description: string;
  unit: string;
  method: string;
  instructions: string[];
  Icon: React.ComponentType<{ className?: string }>;
}

const vitalGuides: VitalGuide[] = [
  {
    id: 'blood-pressure',
    title: 'Blood Pressure',
    description: 'Validated upper-arm cuff measurement',
    unit: 'mmHg',
    method: 'A validated blood-pressure cuff is required. This application has no connected cuff and a face scan or webcam cannot measure blood pressure.',
    instructions: [
      'Use a validated upper-arm blood-pressure cuff with a correctly sized cuff.',
      'Sit quietly for five minutes with your back supported, feet flat, and arm supported at heart level.',
      'Follow the cuff instructions. This app cannot read the device or accept a measurement here.',
    ],
    Icon: Activity,
  },
  {
    id: 'blood-sugar',
    title: 'Blood Sugar',
    description: 'Approved glucose meter or laboratory result',
    unit: 'mg/dL',
    method: 'An approved glucose meter or laboratory result is required. A face scan or webcam cannot measure blood glucose.',
    instructions: [
      'Use an approved glucose meter or a laboratory result.',
      'Follow the device or laboratory instructions, including any timing or fasting requirements.',
      'This app has no meter integration. Results must be recorded through the authorized clinical record workflow.',
    ],
    Icon: Droplets,
  },
  {
    id: 'pulse-rate',
    title: 'Pulse Rate',
    description: 'Suitable medical device or clinician measurement',
    unit: 'bpm',
    method: 'No validated pulse-rate sensor is integrated into this app. Do not use a webcam estimate as a clinical reading.',
    instructions: [
      'Use a suitable medical device or follow a clinician’s measurement instructions.',
      'Remain still and follow the device prompts until it reports a completed result.',
      'This app is not connected to a pulse sensor and does not generate a reading.',
    ],
    Icon: Heart,
  },
  {
    id: 'heart-rate',
    title: 'Heart Rate',
    description: 'Monitor, ECG device, or clinician measurement',
    unit: 'bpm',
    method: 'No validated heart-rate sensor is integrated into this app. Face authentication is separate and cannot measure heart rate.',
    instructions: [
      'Use a suitable heart monitor, ECG device, or clinician measurement.',
      'Follow the device prompts and wait for a completed result.',
      'This app is not connected to a heart-rate sensor and does not estimate a value from a face scan.',
    ],
    Icon: HeartPulse,
  },
];

interface Patient {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

interface VitalsAnalysis {
  status?: 'normal' | 'warning' | 'critical';
  message?: string;
  flaggedParams?: string[];
}

interface VitalsRecord {
  vitalsId: string;
  patientId: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  sugarLevel: number;
  temperature: number;
  heartRate: number;
  pulseRate: number;
  rbcCount: number;
  wbcCount: number;
  recordedAt: string;
  analysis?: VitalsAnalysis;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const VitalsRecordPage: React.FC = () => {
  const isDoctor = useAuthStore((state) => state.user?.role.toLowerCase() === 'doctor');
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(searchParams.get('patientId') || '');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [history, setHistory] = useState<VitalsRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedVital, setSelectedVital] = useState<VitalId | null>(null);
  const [guidedStep, setGuidedStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  useEffect(() => {
    let active = true;
    const loadPatients = async () => {
      setLoadingPatients(true);
      setPatientsError(null);
      try {
        const response = await api.get('/patients', { skipToast: true }) as
          | Patient[]
          | { data?: Patient[] };
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response.data)
            ? response.data
            : [];
        if (!active) return;
        setPatients(list);
        const requestedId = searchParams.get('patientId');
        const nextId = list.some((patient) => patient.patientId === requestedId)
          ? requestedId || ''
          : list[0]?.patientId || '';
        setSelectedPatientId(nextId);
      } catch (error: unknown) {
        if (active) setPatientsError(getErrorMessage(error, 'Failed to load authorized patients.'));
      } finally {
        if (active) setLoadingPatients(false);
      }
    };

    void loadPatients();
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!selectedPatientId) {
      setHistory([]);
      setHistoryError(null);
      setLoadingHistory(false);
      return;
    }

    let active = true;
    const loadHistory = async () => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await api.get(
          `/vitals/patient/${encodeURIComponent(selectedPatientId)}`
        ) as { data?: VitalsRecord[] };
        if (active) setHistory(Array.isArray(response.data) ? response.data : []);
      } catch (error: unknown) {
        if (active) {
          setHistory([]);
          setHistoryError(getErrorMessage(error, 'Failed to load authorized vitals history.'));
        }
      } finally {
        if (active) setLoadingHistory(false);
      }
    };

    void loadHistory();
    return () => {
      active = false;
    };
  }, [selectedPatientId]);

  const activeGuide = vitalGuides.find((guide) => guide.id === selectedVital);

  return (
    <DashboardLayout>
      <div ref={containerRef} className="face-vitals-page">
        <div className="face-vitals-shell">
          <header className="face-vitals-header">
            <div>
              <span className="face-vitals-eyebrow"><ShieldCheck aria-hidden="true" /> SECURE CLINICAL WORKFLOW</span>
              <h1>Vitals</h1>
              <p>Device-led measurement guidance and authorized clinical history.</p>
            </div>
            <span className="face-vitals-status"><span /> No scanner connected</span>
          </header>

          {patientsError && (
            <div
              role={patientsError.toLowerCase().includes('verification') ? 'status' : 'alert'}
              className={`face-vitals-alert ${patientsError.toLowerCase().includes('verification') ? 'verification' : 'error'}`}
            >
              <strong>
                {patientsError.toLowerCase().includes('verification')
                  ? 'Clinical access is not yet available'
                  : 'Could not load authorized patients'}
              </strong>
              <p>{patientsError}</p>
            </div>
          )}

          <section className="face-vitals-console" aria-label="Guided vital measurement">
            <div className="face-vitals-intro">
              <div>
                <span className="face-vitals-eyebrow"><ScanLine aria-hidden="true" /> GUIDED MEASUREMENT</span>
                <h2>{activeGuide ? activeGuide.title : 'Start a guided check'}</h2>
                <p>
                  {activeGuide
                    ? activeGuide.method
                    : 'Choose a measurement to see safe preparation steps. Face recognition is for sign-in only and cannot measure vital signs.'}
                </p>
                {!activeGuide && (
                  <button
                    type="button"
                    className="face-vitals-primary-action face-vitals-start-action"
                    onClick={() => {
                      setSelectedVital(null);
                      setGuidedStep(0);
                    }}
                    aria-label="Start guided vital check"
                  >
                    <ScanLine aria-hidden="true" /> Start guided check
                  </button>
                )}
              </div>
              <div className="face-vitals-illustration" aria-label="Illustration only; no camera or sensor is active">
                <div className="face-vitals-reticle" aria-hidden="true">
                  <span className="face-vitals-corner top-left" />
                  <span className="face-vitals-corner top-right" />
                  <span className="face-vitals-corner bottom-left" />
                  <span className="face-vitals-corner bottom-right" />
                  <Stethoscope aria-hidden="true" />
                  <span className="face-vitals-illustration-line" />
                </div>
                <span className="face-vitals-illustration-caption">GUIDANCE ONLY · NO CAMERA OR DEVICE ACTIVE</span>
              </div>
            </div>

            <div className="face-vitals-safety-note" role="note">
              <Info aria-hidden="true" />
              <p>
                <strong>No validated scanner or device integration is available.</strong> The application will not generate or display a measurement from a webcam, face scan, or animation. Use the suitable medical device and existing authorized clinical workflow.
              </p>
            </div>

            {!activeGuide ? (
              <div className="face-vitals-options" aria-label="Available measurement guidance">
                {vitalGuides.map(({ id, title, description, unit, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="face-vitals-option"
                    onClick={() => {
                      setSelectedVital(id);
                      setGuidedStep(0);
                    }}
                  >
                    <span className="face-vitals-option-icon"><Icon aria-hidden="true" /></span>
                    <span className="face-vitals-option-title">{title}</span>
                    <span className="face-vitals-option-description">{description}</span>
                    <span className="face-vitals-option-footer">
                      <span>{unit}</span>
                      <span>Start check <ArrowRight aria-hidden="true" /></span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="face-vitals-guide" aria-label={`${activeGuide.title} preparation`}>
                <div className="face-vitals-guide-heading">
                  <div className="face-vitals-option-icon"><activeGuide.Icon aria-hidden="true" /></div>
                  <div>
                    <span className="face-vitals-guide-kicker">
                      GUIDED CHECK · STEP {guidedStep + 1} OF {activeGuide.instructions.length}
                    </span>
                    <h3>Prepare your {activeGuide.title.toLowerCase()} measurement</h3>
                  </div>
                  <button
                    type="button"
                    className="face-vitals-back"
                    onClick={() => {
                      setSelectedVital(null);
                      setGuidedStep(0);
                    }}
                  >
                    <ArrowLeft aria-hidden="true" /> Back
                  </button>
                </div>
                <div
                  className="face-vitals-progress"
                  role="progressbar"
                  aria-label="Guidance step"
                  aria-valuemin={1}
                  aria-valuemax={activeGuide.instructions.length}
                  aria-valuenow={guidedStep + 1}
                >
                  <span style={{ width: `${((guidedStep + 1) / activeGuide.instructions.length) * 100}%` }} />
                </div>
                <ol className="face-vitals-instructions">
                  {activeGuide.instructions.map((instruction, index) => (
                    <li key={instruction} className={index === guidedStep ? 'current' : index < guidedStep ? 'complete' : ''}>
                      <span>{index < guidedStep ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
                      <p>{instruction}</p>
                    </li>
                  ))}
                </ol>
                <div className="face-vitals-guide-status" role="status">
                  <span className="face-vitals-status-indicator" />
                  Guide ready · no device connected · no reading generated
                </div>
                <div className="face-vitals-guide-actions">
                  {guidedStep < activeGuide.instructions.length - 1 ? (
                    <button
                      type="button"
                      className="face-vitals-primary-action"
                      onClick={() => setGuidedStep((step) => step + 1)}
                    >
                      Next instruction <ArrowRight aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="face-vitals-device-required" role="status">
                      <Info aria-hidden="true" /> Obtain a genuine result with the required device, then use the existing clinical recording workflow.
                    </span>
                  )}
                  <button
                    type="button"
                    className="face-vitals-secondary-action"
                    onClick={() => {
                      setSelectedVital(null);
                      setGuidedStep(0);
                    }}
                  >
                    Cancel check
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="face-vitals-history">
            <div className="face-vitals-history-header">
              <div>
                <h2>Recorded clinical measurements</h2>
                <p>Only values returned by the authorized vitals records API are displayed.</p>
              </div>
              <label className="face-vitals-patient-select">
                <span>Patient</span>
                <select
                  value={selectedPatientId}
                  onChange={(event) => setSelectedPatientId(event.target.value)}
                  disabled={loadingPatients || Boolean(patientsError) || patients.length === 0}
                  aria-label="Select patient vitals history"
                >
                  {loadingPatients ? (
                    <option value="">Loading patients…</option>
                  ) : patientsError ? (
                    <option value="">Patient list unavailable</option>
                  ) : patients.length === 0 ? (
                    <option value="">No patients available</option>
                  ) : (
                    patients.map((patient) => (
                      <option key={patient.patientId} value={patient.patientId}>
                        {patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient'}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            {!loadingPatients && !patientsError && patients.length === 0 && (
              <Card className="face-vitals-empty">
                <p>{isDoctor ? 'No authorized patients are available for this account.' : 'No patient records are available.'}</p>
              </Card>
            )}
            {loadingHistory && (
              <div className="face-vitals-history-state" role="status">Loading recorded measurements…</div>
            )}
            {!loadingHistory && historyError && (
              <div className="face-vitals-alert error" role="alert">{historyError}</div>
            )}
            {!loadingHistory && !historyError && selectedPatientId && history.length === 0 && (
              <Card className="face-vitals-empty">
                <p>No recorded measurements were returned for this patient.</p>
              </Card>
            )}
            {!loadingHistory && !historyError && history.length > 0 && (
              <div className="face-vitals-history-list">
                {history.map((record) => (
                  <Card key={record.vitalsId} className="face-vitals-history-card">
                    <div className="face-vitals-record-heading">
                      <span><Clock3 aria-hidden="true" /> {new Date(record.recordedAt).toLocaleString()}</span>
                      <span className={`face-vitals-record-status ${record.analysis?.status || 'unknown'}`}>
                        {record.analysis?.status || 'Recorded'}
                      </span>
                    </div>
                    <div className="face-vitals-record-grid">
                      <p>Blood pressure <strong>{record.bloodPressureSystolic}/{record.bloodPressureDiastolic} mmHg</strong></p>
                      <p>Blood sugar <strong>{record.sugarLevel} mg/dL</strong></p>
                      <p>Heart rate <strong>{record.heartRate} bpm</strong></p>
                      <p>Pulse rate <strong>{record.pulseRate} bpm</strong></p>
                      <p>Temperature <strong>{record.temperature} °F</strong></p>
                      <p>RBC <strong>{record.rbcCount} million/µL</strong></p>
                      <p>WBC <strong>{record.wbcCount} cells/µL</strong></p>
                    </div>
                    {record.analysis?.message && <p className="face-vitals-record-message">{record.analysis.message}</p>}
                    {record.analysis?.flaggedParams && record.analysis.flaggedParams.length > 0 && (
                      <p className="face-vitals-record-flags">Flagged: {record.analysis.flaggedParams.join(', ')}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};
