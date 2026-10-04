import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

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
  analysis?: {
    status?: 'normal' | 'warning' | 'critical';
    flaggedParams?: string[];
    message?: string;
  };
}

const statusVariant = (status?: string): 'success' | 'warning' | 'danger' => {
  if (status === 'critical') return 'danger';
  if (status === 'warning') return 'warning';
  return 'success';
};

export const PatientVitalsPage: React.FC = () => {
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMyVitals = async () => {
      try {
        const profileResponse = await api.get('/patients/me') as {
          data?: { patientId?: string };
        };
        const patientId = profileResponse.data?.patientId;
        if (!patientId) {
          throw new Error('No patient profile is linked to your account.');
        }

        const response = await api.get(
          `/vitals/patient/${encodeURIComponent(patientId)}`
        ) as { data?: VitalsRecord[] };
        if (!cancelled) setRecords(Array.isArray(response.data) ? response.data : []);
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
  }, []);

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
                          {record.analysis?.status || 'normal'}
                        </Badge>
                        <span className="text-xs text-textSecondary">
                          {new Date(record.recordedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-textSecondary sm:grid-cols-4">
                        <span>Blood pressure: {record.bloodPressureSystolic}/{record.bloodPressureDiastolic} mmHg</span>
                        <span>Heart rate: {record.heartRate} bpm</span>
                        <span>Pulse rate: {record.pulseRate} bpm</span>
                        <span>Blood sugar: {record.sugarLevel}</span>
                        <span>Temperature: {record.temperature}</span>
                        <span>RBC count: {record.rbcCount}</span>
                        <span>WBC count: {record.wbcCount}</span>
                      </div>
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
