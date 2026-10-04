import React, { useRef,  useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Medicine { name: string; dosage: string; duration: string; instructions: string; }
interface Prescription { _id: string; patientId: string; doctorId: string; diagnosis: string; medicines: Medicine[]; createdAt?: string; }

export const PrescriptionListPage: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/prescriptions/patient/${id}`) as Prescription[] | { data: Prescription[] };
      setPrescriptions(Array.isArray(res) ? res : (res as { data: Prescription[] }).data || []);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load prescriptions'); }
    finally { setLoading(false); }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Prescriptions</h1>
          <p className="text-sm text-textSecondary mt-0.5">View prescriptions issued to patients.</p>
        </div>
        <Link to="/prescriptions/new" className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          <PlusCircle className="w-4 h-4 mr-2" />New Prescription
        </Link>
      </div>

      <div className="mb-6 flex gap-3 max-w-md">
        <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Enter Patient ID..."
          className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" />
        <button onClick={() => fetchPrescriptions(patientId)} className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors">Load</button>
      </div>

      {loading && <div className="flex items-center justify-center py-16 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading prescriptions...</span></div>}
      {!loading && error && <div className="p-4 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">{error}</div>}
      {!loading && prescriptions.length === 0 && patientId && !error && (
        <div className="p-8 text-center text-textSecondary text-sm">No prescriptions found for this patient.</div>
      )}
      {!loading && prescriptions.length > 0 && (
        <div className="space-y-4">
          {prescriptions.map((p) => (
            <Card key={p._id}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0"><FileText className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-textPrimary truncate">Diagnosis: {p.diagnosis}</p>
                    <p className="text-xs text-textSecondary shrink-0">{new Date(p.createdAt || '').toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs text-textSecondary mt-1">Doctor ID: {p.doctorId}</p>
                  <div className="mt-3 space-y-1.5">
                    {p.medicines.map((m, i) => (
                      <div key={i} className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-textPrimary bg-slate-50 border border-border rounded-md px-3 py-1.5">
                        <span className="font-semibold">{m.name}</span>
                        {m.dosage && <span className="text-textSecondary">Dosage: {m.dosage}</span>}
                        {m.duration && <span className="text-textSecondary">Duration: {m.duration}</span>}
                        {m.instructions && <span className="text-textSecondary">Instructions: {m.instructions}</span>}
                      </div>
                    ))}
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
