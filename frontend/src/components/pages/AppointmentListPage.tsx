import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  notes?: string;
  status: string;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' => {
  if (['completed', 'done'].includes(status)) return 'success';
  if (['cancelled', 'missed'].includes(status)) return 'danger';
  return 'warning';
};

export const AppointmentListPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/appointments') as { data?: Appointment[] };
        setAppointments(Array.isArray(res.data) ? res.data : []);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load appointments'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Appointments</h1>
          <p className="text-sm text-textSecondary mt-0.5">All patient appointments and booking statuses.</p>
        </div>
        <Link to="/appointments/book" className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          <PlusCircle className="w-4 h-4 mr-2" />Book Appointment
        </Link>
      </div>
      {loading && <div className="flex items-center justify-center py-16 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading appointments...</span></div>}
      {!loading && error && <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm">{error}</div>}
      {!loading && !error && (
        <Card className="!p-0 overflow-hidden">
          {appointments.length === 0
            ? <div className="p-8 text-center text-textSecondary text-sm">No appointments scheduled yet.</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background border-b border-textPrimary/10 text-xs uppercase font-semibold text-textSecondary">
                    <tr><th className="px-6 py-3">Patient ID</th><th className="px-6 py-3">Doctor ID</th><th className="px-6 py-3">Date &amp; Time</th><th className="px-6 py-3">Notes</th><th className="px-6 py-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border text-textPrimary">
                    {appointments.map((a) => (
                      <tr key={a.appointmentId} className="hover:bg-primary/5">
                        <td className="px-6 py-4 font-medium">{a.patientId}</td>
                        <td className="px-6 py-4 text-textSecondary">{a.doctorId}</td>
                        <td className="px-6 py-4 text-textSecondary">{new Date(a.appointmentDate).toLocaleString()}</td>
                        <td className="px-6 py-4 text-textSecondary">{a.notes || '—'}</td>
                        <td className="px-6 py-4"><Badge variant={statusVariant(a.status)}>{a.status || 'scheduled'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}
          </div>
    </DashboardLayout>
  );
};
