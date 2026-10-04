// Records vitals and presents the existing rule-based analysis to staff.
import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import { Mic, Activity, AlertTriangle, CircleCheck } from 'lucide-react';
import { VoiceButton } from '../molecules/VoiceButton';
import { useVoiceInput } from '../../shared/hooks/useVoiceInput';
import { useVoiceStore } from '../../store/voiceStore';
import { parseVitalsSpeech, type ParsedVitals } from '../../shared/utils/parseVitalsSpeech';
import { buildVitalsSummary } from '../../shared/utils/buildVitalsSummary';
import { vitalsLimits } from '../../shared/utils/vitalsLimits';

interface Patient {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
}

const boundedNumber = (label: string, min: number, max: number) =>
  z.coerce.number()
    .min(min, `${label} must be between ${min} and ${max}.`)
    .max(max, `${label} must be between ${min} and ${max}.`);

const schema = z.object({
  patientId: z.string().min(1, 'Patient selection is required'),
  bloodPressureSystolic: boundedNumber(
    vitalsLimits.bloodPressureSystolic.label,
    vitalsLimits.bloodPressureSystolic.min,
    vitalsLimits.bloodPressureSystolic.max,
  ),
  bloodPressureDiastolic: boundedNumber(
    vitalsLimits.bloodPressureDiastolic.label,
    vitalsLimits.bloodPressureDiastolic.min,
    vitalsLimits.bloodPressureDiastolic.max,
  ),
  sugarLevel: boundedNumber(
    vitalsLimits.sugarLevel.label,
    vitalsLimits.sugarLevel.min,
    vitalsLimits.sugarLevel.max,
  ),
  temperature: boundedNumber(
    vitalsLimits.temperature.label,
    vitalsLimits.temperature.min,
    vitalsLimits.temperature.max,
  ),
  heartRate: boundedNumber(
    vitalsLimits.heartRate.label,
    vitalsLimits.heartRate.min,
    vitalsLimits.heartRate.max,
  ),
  pulseRate: boundedNumber(
    vitalsLimits.pulseRate.label,
    vitalsLimits.pulseRate.min,
    vitalsLimits.pulseRate.max,
  ),
  rbcCount: boundedNumber(
    vitalsLimits.rbcCount.label,
    vitalsLimits.rbcCount.min,
    vitalsLimits.rbcCount.max,
  ),
  wbcCount: boundedNumber(
    vitalsLimits.wbcCount.label,
    vitalsLimits.wbcCount.min,
    vitalsLimits.wbcCount.max,
  ),
  notes: z.string().optional(),
}).refine(
  (values) => values.bloodPressureSystolic > values.bloodPressureDiastolic,
  {
    message: 'Systolic blood pressure must be greater than diastolic blood pressure.',
    path: ['bloodPressureSystolic'],
  },
);
type FormData = z.infer<typeof schema>;

const vitalFields = Object.entries(vitalsLimits) as Array<[
  keyof typeof vitalsLimits,
  (typeof vitalsLimits)[keyof typeof vitalsLimits],
]>;

const getAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!birthdayHasPassed) age -= 1;
  return age >= 0 ? age : null;
};

interface VitalsAnalysis {
  status: 'normal' | 'warning' | 'critical';
  flaggedParams: string[];
  message: string;
  details?: unknown;
  trendNotes?: unknown;
  rangesUsed?: unknown;
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

export const VitalsRecordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<VitalsAnalysis | null>(null);
  const [analysisValues, setAnalysisValues] = useState<ParsedVitals | null>(null);
  const [pendingVitals, setPendingVitals] = useState<FormData | null>(null);
  const [voiceFilledFields, setVoiceFilledFields] = useState<Array<keyof ParsedVitals>>([]);
  const [history, setHistory] = useState<VitalsRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });
  const selectedPatientId = watch('patientId');
  const language = useVoiceStore((state) => state.language);
  const {
    start,
    stop,
    isListening,
    transcript,
    isSupported,
    error: voiceError,
    languageNotice,
  } = useVoiceInput();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);
        const res: any = await api.get('/patients');
        const list: Patient[] = Array.isArray(res) ? res : res?.data || [];
        setPatients(list);
        const requestedPatientId = searchParams.get('patientId');
        const selectedPatient = list.find((patient) => patient.patientId === requestedPatientId) || list[0];
        if (selectedPatient) {
          setValue('patientId', selectedPatient.patientId);
        }
      } catch {
        toast.error('Failed to load patients list');
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [searchParams, setValue]);

  useEffect(() => {
    if (!selectedPatientId) {
      setHistory([]);
      setHistoryError(null);
      return;
    }

    let cancelled = false;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await api.get(
          `/vitals/patient/${encodeURIComponent(selectedPatientId)}`
        ) as { data?: VitalsRecord[] };
        if (!cancelled) setHistory(Array.isArray(response.data) ? response.data : []);
      } catch (error: unknown) {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(error instanceof Error ? error.message : 'Failed to load vitals history');
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedPatientId]);

  // Apply recognized values only when listening has ended; saving stays manual.
  useEffect(() => {
    if (isListening || !transcript.trim()) return;
    const parsed = parseVitalsSpeech(transcript);
    const validEntries = Object.entries(parsed).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 1
    ) as Array<[keyof ParsedVitals, number]>;
    validEntries.forEach(([field, value]) => {
      setValue(field, value, { shouldDirty: true, shouldValidate: true });
    });
    if (validEntries.length > 0) {
      setVoiceFilledFields(validEntries.map(([field]) => field));
    }
  }, [isListening, setValue, transcript]);

  const reviewVitals = (data: FormData) => {
    setPendingVitals(data);
    setAnalysis(null);
  };

  const saveVitals = async () => {
    if (!pendingVitals) return;
    setIsSubmitting(true);
    setAnalysis(null);
    try {
      const payload = {
        patientId: pendingVitals.patientId,
        bloodPressureSystolic: pendingVitals.bloodPressureSystolic,
        bloodPressureDiastolic: pendingVitals.bloodPressureDiastolic,
        sugarLevel: pendingVitals.sugarLevel,
        temperature: pendingVitals.temperature,
        heartRate: pendingVitals.heartRate,
        pulseRate: pendingVitals.pulseRate,
        rbcCount: pendingVitals.rbcCount,
        wbcCount: pendingVitals.wbcCount,
      };
      const response = await api.post('/vitals', payload) as {
        analysis?: VitalsAnalysis;
      };
      if (!response.analysis) {
        throw new Error('Vitals were recorded, but no analysis report was returned.');
      }
      setAnalysis(response.analysis);
      setAnalysisValues(payload);
      toast.success('Vitals recorded successfully!');
      try {
        const historyResponse = await api.get(
          `/vitals/patient/${encodeURIComponent(pendingVitals.patientId)}`
        ) as { data?: VitalsRecord[] };
        setHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
        setHistoryError(null);
      } catch (historyFetchError: unknown) {
        setHistoryError(
          historyFetchError instanceof Error
            ? historyFetchError.message
            : 'Vitals were saved, but history could not be refreshed'
        );
      }
      setPendingVitals(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);
  const selectedPatient = patients.find((patient) => patient.patientId === selectedPatientId);
  const patientName = selectedPatient?.fullName
    || [selectedPatient?.firstName, selectedPatient?.lastName].filter(Boolean).join(' ')
    || 'Patient';
  const analysisSummary = analysis && analysisValues
    ? buildVitalsSummary(patientName, analysisValues, analysis, language)
    : '';
  const startVitalsDictation = () => {
    setVoiceFilledFields([]);
    start();
  };
  const selectedPatientAge = getAge(selectedPatient?.dateOfBirth);
  const pendingPatient = pendingVitals
    ? patients.find((patient) => patient.patientId === pendingVitals.patientId)
    : undefined;

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mx-auto w-full max-w-[1100px]">
          <h1 className="mb-6 text-2xl font-medium text-textPrimary">Patient Vitals</h1>
          <Card>
            <div className="mb-6 rounded-xl border border-textPrimary/10 bg-background p-4">
              {isSupported ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={isListening ? stop : startVitalsDictation}
                    className="h-10 rounded-md border-primary/20 text-primary"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    {isListening ? 'Stop listening' : 'Speak the readings'}
                  </Button>
                  <p className="mt-2 text-xs text-textPrimary/70">
                    Voice input may send audio to your browser's speech service. Do not use it if your clinic does not allow it.
                  </p>
                </>
              ) : (
                <p className="text-xs text-textPrimary/70">Voice input works best in Chrome or Edge.</p>
              )}
              {isListening && (
                <p aria-live="polite" className="mt-2 text-sm text-textPrimary">
                  Listening... {transcript}
                </p>
              )}
              {!isListening && transcript && (
                <p className="mt-2 text-sm text-textPrimary">Recognized: {transcript}</p>
              )}
              {voiceError && (
                <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{voiceError}</span>
                </p>
              )}
              {languageNotice && (
                <p role="status" className="mt-2 text-xs text-textPrimary/70">{languageNotice}</p>
              )}
              {voiceFilledFields.length > 0 && (
                <p className="mt-2 text-xs text-primary">
                  Filled from speech: {voiceFilledFields.join(', ')}. Review these values before saving.
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit(reviewVitals)}>
              <fieldset disabled={Boolean(pendingVitals)} className="space-y-6 disabled:opacity-75">
              <div>
                <label
                  htmlFor="patientId"
                  className="block text-sm font-medium text-textPrimary mb-1.5"
                >
                  Select Patient <span className="text-danger">*</span>
                </label>
                <select
                  id="patientId"
                  disabled={loadingPatients || patients.length === 0}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
                  {...register('patientId')}
                >
                  {loadingPatients ? (
                    <option value="">Loading patients...</option>
                  ) : patients.length === 0 ? (
                    <option value="">No patients available</option>
                  ) : (
                    patients.map((p) => {
                      const displayName =
                        p.fullName ||
                        `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
                        'Unnamed Patient';
                      return (
                        <option key={p.patientId} value={p.patientId}>
                          {displayName}
                        </option>
                      );
                    })
                  )}
                </select>
                {errors.patientId && (
                  <p className="text-xs text-danger mt-1">{errors.patientId.message}</p>
                )}
                {selectedPatient && (
                  <div className="mt-3 rounded-md border border-textPrimary/10 bg-background px-4 py-3 text-sm">
                    <p className="font-medium text-textPrimary">{patientName}</p>
                    <p className="mt-1 text-xs text-textSecondary">
                      {selectedPatientAge !== null ? `Age ${selectedPatientAge}` : 'Age unavailable'}
                      {' · '}
                      {selectedPatient.phone || 'Phone unavailable'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {vitalFields.map(([field, limits]) => (
                  <div key={field} className="relative">
                    <FormField
                      label={limits.label}
                      type="number"
                      step={limits.step}
                      min={limits.min}
                      max={limits.max}
                      placeholder={limits.placeholder}
                      required
                      className={voiceFilledFields.includes(field) ? 'rounded-md ring-2 ring-primary/20' : ''}
                      error={errors[field]?.message}
                      {...register(field)}
                    />
                    <span className="pointer-events-none absolute right-3 top-[2.55rem] text-xs text-textSecondary">
                      {limits.unit}
                    </span>
                    <p className="mt-1 text-xs text-textSecondary">Usual: {limits.usual}</p>
                  </div>
                ))}
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Clinical Notes <span className="text-textSecondary">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional observations..."
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  {...register('notes')}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <Button type="submit" variant="primary">
                  Review Vitals
                </Button>
              </div>
              </fieldset>
            </form>
            {pendingVitals && (
              <section aria-labelledby="vitals-review-title" className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h2 id="vitals-review-title" className="text-lg font-medium text-textPrimary">Review before saving</h2>
                <p className="mt-1 text-sm text-textSecondary">
                  Confirm the patient and readings. Nothing is saved until you choose Save reviewed vitals.
                </p>
                <p className="mt-3 text-sm font-medium text-textPrimary">
                  {pendingPatient?.fullName || [pendingPatient?.firstName, pendingPatient?.lastName].filter(Boolean).join(' ') || 'Selected patient'}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {vitalFields.map(([field, limits]) => (
                    <p key={field} className="rounded-md border border-textPrimary/10 bg-surface px-3 py-2 text-textPrimary">
                      {limits.label}: {pendingVitals[field]} {limits.unit}
                    </p>
                  ))}
                </div>
                {pendingVitals.notes && (
                  <p className="mt-3 text-sm text-textPrimary">Clinical notes: {pendingVitals.notes}</p>
                )}
                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-textPrimary/10 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setPendingVitals(null)}>
                    Edit values
                  </Button>
                  <Button type="button" variant="primary" isLoading={isSubmitting} onClick={() => void saveVitals()}>
                    Save reviewed vitals
                  </Button>
                </div>
              </section>
            )}
            {analysis && (
              <div className="mt-6 rounded-md border border-textPrimary/10 bg-background p-4" role="status">
                <div className="flex items-center gap-2">
                  {analysis.status === 'critical'
                    ? <AlertTriangle className="h-4 w-4 text-danger" />
                    : analysis.status === 'warning'
                      ? <Activity className="h-4 w-4 text-danger" />
                      : <CircleCheck className="h-4 w-4 text-voicePrimary" />}
                  <h2 className="font-semibold text-textPrimary">Vitals Analysis</h2>
                  <span className="text-sm font-semibold text-textPrimary">{analysis.status}</span>
                </div>
                <p className="mt-2 text-sm text-textPrimary">{analysis.message}</p>
                {analysis.flaggedParams.length > 0 && (
                  <p className="mt-2 text-sm text-textSecondary">
                    Flagged parameters: {analysis.flaggedParams.join(', ')}
                  </p>
                )}
                <div className="mt-3 border-t border-textPrimary/10 pt-3">
                  <p className="mb-2 text-sm text-textPrimary">{analysisSummary}</p>
                  <VoiceButton
                    text={analysisSummary}
                    englishText={analysis && analysisValues
                      ? buildVitalsSummary(patientName, analysisValues, analysis, 'en')
                      : analysisSummary}
                  />
                </div>
              </div>
            )}
          </Card>
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-medium text-textPrimary">Selected patient vitals history</h2>
            {loadingHistory && (
              <div className="flex items-center justify-center py-10 text-primary">
                <span className="text-sm text-textSecondary">Loading vitals history...</span>
              </div>
            )}
            {!loadingHistory && historyError && (
              <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm">
                {historyError}
              </div>
            )}
            {!loadingHistory && !historyError && selectedPatientId && history.length === 0 && (
              <Card>
                <p className="text-center text-textSecondary text-sm py-3">
                  No vitals records found for this patient.
                </p>
              </Card>
            )}
            {!loadingHistory && !historyError && history.length > 0 && (
              <div className="space-y-3">
                {history.map((record) => (
                  <Card key={record.vitalsId}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="mb-3 text-sm font-medium text-textPrimary">
                          {new Date(record.recordedAt).toLocaleString()}
                        </p>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-textSecondary sm:grid-cols-2 lg:grid-cols-3">
                          <span>Blood pressure: {record.bloodPressureSystolic}/{record.bloodPressureDiastolic} mmHg</span>
                          <span>Heart rate: {record.heartRate} bpm</span>
                          <span>Pulse rate: {record.pulseRate} bpm</span>
                          <span>Blood sugar: {record.sugarLevel} mg/dL</span>
                          <span>Temperature: {record.temperature} °F</span>
                          <span>RBC: {record.rbcCount} million/µL</span>
                          <span>WBC: {record.wbcCount} cells/µL</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-textPrimary/10 bg-background px-2.5 py-1 text-xs font-semibold capitalize text-textPrimary">
                          {record.analysis?.status === 'critical'
                            ? <AlertTriangle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                            : record.analysis?.status === 'warning'
                              ? <Activity className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                              : record.analysis?.status === 'normal'
                                ? <CircleCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                : <Activity className="h-3.5 w-3.5 text-textPrimary" aria-hidden="true" />}
                          {record.analysis?.status || 'No analysis returned'}
                        </span>
                        {record.analysis && (
                          <VoiceButton
                            text={buildVitalsSummary(patientName, record, record.analysis, language)}
                            englishText={buildVitalsSummary(patientName, record, record.analysis, 'en')}
                          />
                        )}
                      </div>
                    </div>
                    {record.analysis && (
                      <p className="mt-2 text-sm text-textPrimary">
                        {buildVitalsSummary(patientName, record, record.analysis, language)}
                      </p>
                    )}
                    {record.analysis?.message && (
                      <p className="mt-2 text-sm text-textSecondary">{record.analysis.message}</p>
                    )}
                    {record.analysis?.flaggedParams && record.analysis.flaggedParams.length > 0 && (
                      <p className="mt-1 text-xs text-danger">
                        Flagged: {record.analysis.flaggedParams.join(', ')}
                      </p>
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
