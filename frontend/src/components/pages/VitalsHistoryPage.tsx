// Reviews previous vitals readings and their returned analysis.
import React, { useRef, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, Activity, AlertTriangle, CircleCheck } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import { VoiceButton } from '../molecules/VoiceButton';
import { useVoiceStore } from '../../store/voiceStore';
import { buildVitalsSummary } from '../../shared/utils/buildVitalsSummary';

interface Vitals {
  vitalsId: string;
  patientId: string;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  sugarLevel: number;
  temperature: number;
  pulseRate: number;
  rbcCount: number;
  wbcCount: number;
  recordedAt: string;
  analysis?: {
    status?: 'normal' | 'warning' | 'critical';
    flaggedParams?: string[];
    message?: string;
    details?: unknown;
    trendNotes?: unknown;
    rangesUsed?: unknown;
  };
}

export const VitalsHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [patientName, setPatientName] = useState('Patient');
  const [loading, setLoading] = useState(Boolean(searchParams.get('patientId')));
  const [error, setError] = useState<string | null>(null);

  const fetchVitals = async (id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId) {
      setVitals([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/vitals/patient/${encodeURIComponent(trimmedId)}`) as {
        data?: Vitals[];
      };
      setVitals(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setVitals([]);
      setError(err instanceof Error ? err.message : 'Failed to load vitals history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVitals(patientId);
  }, [patientId]);

  // Use the patient's name in every spoken and written reading summary.
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    const fetchPatient = async () => {
      try {
        const response = await api.get(`/patients/${encodeURIComponent(patientId)}`) as {
          data?: { fullName?: string; firstName?: string; lastName?: string };
        };
        const patient = response.data;
        if (!cancelled && patient) {
          setPatientName(patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient');
        }
      } catch {
        if (!cancelled) setPatientName('Patient');
      }
    };
    void fetchPatient();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const language = useVoiceStore((state) => state.language);
  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Vitals History</h1>
          <p className="text-sm text-textSecondary mt-0.5">Review patient vital signs and clinical alerts.</p>
        </div>
        <Link to="/vitals" className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          <PlusCircle className="w-4 h-4 mr-2" />Record Vitals
        </Link>
      </div>

      <div className="mb-6 flex gap-3 max-w-md">
        <input
          type="text"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          placeholder="Enter Patient ID..."
          className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        <button
          onClick={() => fetchVitals(patientId)}
          className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
        >
          Load
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-16 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading vitals...</span></div>}
      {!loading && error && <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm">{error}</div>}
      {!loading && !error && !patientId && (
        <div className="p-8 text-center text-textSecondary text-sm">
          Enter a patient ID to view vitals history.
        </div>
      )}
      {!loading && vitals.length === 0 && patientId && !error && (
        <div className="p-8 text-center text-textSecondary text-sm">No vitals records found for this patient.</div>
      )}
      {!loading && vitals.length > 0 && (
        <div className="space-y-3">
          {vitals.map((v) => (
            <Card key={v.vitalsId}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><Activity className="w-5 h-5" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {v.analysis?.status === 'critical'
                        ? <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
                        : v.analysis?.status === 'warning'
                          ? <Activity className="h-4 w-4 text-danger" aria-hidden="true" />
                          : v.analysis?.status === 'normal'
                            ? <CircleCheck className="h-4 w-4 text-voicePrimary" aria-hidden="true" />
                            : <Activity className="h-4 w-4 text-textPrimary" aria-hidden="true" />}
                      <span className="text-xs font-semibold text-textPrimary">
                        {v.analysis?.status || 'No analysis returned'}
                      </span>
                      <span className="text-xs text-textSecondary">Vitals report</span>
                      {v.analysis && (
                        <VoiceButton
                          text={buildVitalsSummary(patientName, v, v.analysis, language)}
                          englishText={buildVitalsSummary(patientName, v, v.analysis, 'en')}
                        />
                      )}
                    </div>
                    {v.analysis && (
                      <p className="mb-2 text-sm text-textPrimary">
                        {buildVitalsSummary(patientName, v, v.analysis, language)}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-1 text-xs text-textSecondary">
                      <span>Blood pressure: {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg</span>
                      <span>Heart rate: {v.heartRate} bpm</span>
                      <span>Pulse rate: {v.pulseRate} bpm</span>
                      <span>Blood sugar: {v.sugarLevel}</span>
                      <span>Temperature: {v.temperature}</span>
                      <span>RBC count: {v.rbcCount}</span>
                      <span>WBC count: {v.wbcCount}</span>
                    </div>
                    {v.analysis?.message && (
                      <p className="text-xs text-textPrimary mt-2">{v.analysis.message}</p>
                    )}
                    {v.analysis?.flaggedParams && v.analysis.flaggedParams.length > 0 && (
                      <p className="text-xs text-danger mt-1">
                        Flagged: {v.analysis.flaggedParams.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-textSecondary shrink-0">
                  {new Date(v.recordedAt).toLocaleString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
          </div>
    </DashboardLayout>
  );
};
