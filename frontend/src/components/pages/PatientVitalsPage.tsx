import React, { useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../../shared/services/api';
import { fetchPatientVitals, type VitalsRecord } from '../../shared/services/vitals';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

const statusVariant = (status?: string): 'success' | 'warning' | 'danger' => {
  if (status === 'critical') return 'danger';
  if (status === 'warning' || status === 'inconclusive') return 'warning';
  return 'success';
};

export const PatientVitalsPage: React.FC = () => {
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchMyVitals = async () => {
      try {
        setLoading(true);
        setError(null);
        const profileResponse = await api.get('/patients/me') as {
          data?: { patientId?: string };
        };
        const patientId = profileResponse.data?.patientId;
        if (!patientId) {
          throw new Error('No patient profile is linked to your account.');
        }

        const vitals = await fetchPatientVitals(patientId);
        if (!cancelled) setRecords(vitals);
      } catch (err: unknown) {
        if (!cancelled) {
          setRecords([]);
          setError(err instanceof Error ? err.message : 'Failed to load your vitals');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchMyVitals();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">My Vitals</h1>
          <p className="text-sm text-textSecondary mt-1">
            Review your recorded vital signs and analysis reports.
          </p>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            aria-label="Refresh my vitals"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-textPrimary hover:bg-background disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading your vitals...</span>
          </div>
        )}
        {!loading && error && (
          <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm">
            {error}
          </div>
        )}
        {!loading && !error && records.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-textSecondary">No vitals records found.</p>
          </Card>
        )}
        {!loading && !error && records.length > 0 && (
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.vitalsId}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={statusVariant(record.analysis?.status)}>
                          {record.analysis?.status || (record.selectedMetrics ? 'scan' : 'normal')}
                        </Badge>
                        <span className="text-xs text-textSecondary">
                          {new Date(record.recordedAt).toLocaleString()}
                        </span>
                      </div>
                      {record.selectedMetrics?.length ? (
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-textSecondary sm:grid-cols-4">
                        {record.selectedMetrics.includes('heartRate') && <span>Heart rate: {record.heartRate ?? 'Could not measure'}{record.heartRate ? ' bpm' : ''}</span>}
                        {record.selectedMetrics.includes('breathingRate') && <span>Breathing rate: {record.breathingRate ?? 'Could not measure'}{record.breathingRate ? ' breaths/min' : ''}</span>}
                        {record.selectedMetrics.includes('hrv') && <span>Stress / HRV: {record.hrv ?? 'Could not measure'}</span>}
                        {record.spo2 !== undefined && <span>SpO2: {record.spo2}%</span>}
                        {record.bloodPressure && <span>Blood pressure: {record.bloodPressure.systolic}/{record.bloodPressure.diastolic} mmHg</span>}
                        <span>Estimated values for general wellness. Not a medical diagnosis.</span>
                      </div>
                      ) : (
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-textSecondary sm:grid-cols-4">
                        {record.bloodPressureSystolic !== undefined && <span>Blood pressure: {record.bloodPressureSystolic}/{record.bloodPressureDiastolic} mmHg</span>}
                        {record.heartRate !== undefined && <span>Heart rate: {record.heartRate} bpm</span>}
                        {record.pulseRate !== undefined && <span>Pulse rate: {record.pulseRate} bpm</span>}
                        {record.sugarLevel !== undefined && <span>Blood sugar: {record.sugarLevel} mg/dL</span>}
                        <span>Temperature: {record.temperature ?? '—'} °F</span>
                        <span>RBC count: {record.rbcCount ?? '—'} million/µL</span>
                        <span>WBC count: {record.wbcCount ?? '—'} cells/µL</span>
                      </div>
                      )}
                      {record.analysis?.message && (
                        <p className="mt-2 text-sm text-textPrimary">{record.analysis.message}</p>
                      )}
                      {record.analysis?.flaggedParams && record.analysis.flaggedParams.length > 0 && (
                        <p className="mt-1 text-xs text-danger">
                          Flagged: {record.analysis.flaggedParams.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
