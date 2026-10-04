import React, { useRef,  useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, Activity } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Vitals {
  _id: string;
  patientId: string;
  heartRate: number;
  bloodPressure?: { systolic: number; diastolic: number };
  temperature: number;
  oxygenSaturation: number;
  isCritical?: boolean;
  recordedAt?: string;
  createdAt?: string;
}

export const VitalsHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '');
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVitals = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/vitals/patient/${id}`) as Vitals[] | { data: Vitals[] };
      setVitals(Array.isArray(res) ? res : (res as { data: Vitals[] }).data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load vitals history');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (patientId) fetchVitals(patientId);
  }, [patientId]);

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
        <Link to="/vitals/record" className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
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
      {!loading && error && <div className="p-4 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">{error}</div>}
      {!loading && vitals.length === 0 && patientId && !error && (
        <div className="p-8 text-center text-textSecondary text-sm">No vitals records found for this patient.</div>
      )}
      {!loading && vitals.length > 0 && (
        <div className="space-y-3">
          {vitals.map((v) => (
            <Card key={v._id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><Activity className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary">
                        HR: {v.heartRate} bpm &nbsp;|&nbsp; BP: {v.bloodPressure ? `${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}` : 'N/A'} mmHg
                      </p>
                      {v.isCritical && <Badge variant="danger">Critical</Badge>}
                    </div>
                    <p className="text-xs text-textSecondary mt-0.5">
                      Temp: {v.temperature}°C &nbsp;|&nbsp; O₂ Sat: {v.oxygenSaturation}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-textSecondary shrink-0">
                  {new Date(v.recordedAt || v.createdAt || '').toLocaleString()}
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
