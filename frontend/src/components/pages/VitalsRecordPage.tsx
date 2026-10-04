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

interface Patient {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

const schema = z.object({
  patientId: z.string().min(1, 'Patient selection is required'),
  bloodPressureSystolic: z.coerce.number().min(1, 'Systolic BP is required'),
  bloodPressureDiastolic: z.coerce.number().min(1, 'Diastolic BP is required'),
  sugarLevel: z.coerce.number().min(1, 'Blood sugar is required'),
  temperature: z.coerce.number().min(1, 'Temperature is required'),
  heartRate: z.coerce.number().min(1, 'Heart rate is required'),
  pulseRate: z.coerce.number().min(1, 'Pulse rate is required'),
  rbcCount: z.coerce.number().min(1, 'RBC count is required'),
  wbcCount: z.coerce.number().min(1, 'WBC count is required'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setAnalysis(null);
    try {
      const payload = {
        patientId: data.patientId,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        sugarLevel: data.sugarLevel,
        temperature: data.temperature,
        heartRate: data.heartRate,
        pulseRate: data.pulseRate,
        rbcCount: data.rbcCount,
        wbcCount: data.wbcCount,
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
          `/vitals/patient/${encodeURIComponent(data.patientId)}`
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

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-textPrimary mb-6">Patient Vitals</h1>
          <Card>
            <div className="mb-4 rounded-md border border-textPrimary/10 p-3">
              {isSupported ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={isListening ? stop : startVitalsDictation}
                    className="rounded-md border-voicePrimary/20 text-voicePrimary"
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
                <p className="mt-2 text-xs text-voicePrimary">
                  Filled from speech: {voiceFilledFields.join(', ')}. Review these values before saving.
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FormField
                  label="Heart Rate (bpm)"
                  type="number"
                  step="1"
                  placeholder="72"
                  required
                  className={voiceFilledFields.includes('heartRate') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.heartRate?.message}
                  {...register('heartRate')}
                />
                <FormField
                  label="BP Systolic (mmHg)"
                  type="number"
                  step="1"
                  placeholder="120"
                  required
                  className={voiceFilledFields.includes('bloodPressureSystolic') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.bloodPressureSystolic?.message}
                  {...register('bloodPressureSystolic')}
                />
                <FormField
                  label="BP Diastolic (mmHg)"
                  type="number"
                  step="1"
                  placeholder="80"
                  required
                  className={voiceFilledFields.includes('bloodPressureDiastolic') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.bloodPressureDiastolic?.message}
                  {...register('bloodPressureDiastolic')}
                />
                <FormField
                  label="Blood Sugar"
                  type="number"
                  step="any"
                  placeholder="100"
                  required
                  className={voiceFilledFields.includes('sugarLevel') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.sugarLevel?.message}
                  {...register('sugarLevel')}
                />
                <FormField
                  label="Temperature (°C)"
                  type="number"
                  step="any"
                  placeholder="36.6"
                  required
                  className={voiceFilledFields.includes('temperature') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.temperature?.message}
                  {...register('temperature')}
                />
                <FormField
                  label="Pulse Rate (bpm)"
                  type="number"
                  step="1"
                  placeholder="72"
                  required
                  className={voiceFilledFields.includes('pulseRate') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.pulseRate?.message}
                  {...register('pulseRate')}
                />
                <FormField
                  label="RBC Count"
                  type="number"
                  step="any"
                  placeholder="4.5"
                  required
                  className={voiceFilledFields.includes('rbcCount') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.rbcCount?.message}
                  {...register('rbcCount')}
                />
                <FormField
                  label="WBC Count"
                  type="number"
                  step="any"
                  placeholder="7000"
                  required
                  className={voiceFilledFields.includes('wbcCount') ? 'rounded-md ring-2 ring-voicePrimary/20' : ''}
                  error={errors.wbcCount?.message}
                  {...register('wbcCount')}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Clinical Notes <span className="text-textSecondary">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional observations..."
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  {...register('notes')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Save Vitals
                </Button>
              </div>
            </form>
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
            <h2 className="text-xl font-bold text-textPrimary mb-4">Selected Patient Vitals History</h2>
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-textSecondary">
                        <span>BP: {record.bloodPressureSystolic}/{record.bloodPressureDiastolic} mmHg</span>
                        <span>HR: {record.heartRate} bpm</span>
                        <span>Pulse: {record.pulseRate} bpm</span>
                        <span>Sugar: {record.sugarLevel}</span>
                        <span>Temperature: {record.temperature}</span>
                        <span>RBC: {record.rbcCount}</span>
                        <span>WBC: {record.wbcCount}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {record.analysis?.status === 'critical'
                          ? <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
                          : record.analysis?.status === 'warning'
                            ? <Activity className="h-4 w-4 text-danger" aria-hidden="true" />
                            : record.analysis?.status === 'normal'
                              ? <CircleCheck className="h-4 w-4 text-voicePrimary" aria-hidden="true" />
                              : <Activity className="h-4 w-4 text-textPrimary" aria-hidden="true" />}
                        <span className="text-xs font-semibold text-textPrimary">
                          {record.analysis?.status || 'No analysis returned'}
                        </span>
                        <span className="text-xs text-textSecondary">
                          {new Date(record.recordedAt).toLocaleString()}
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
