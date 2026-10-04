import React, { useEffect, useRef, useState } from 'react';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
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
  status: string;
  notes?: string;
}

type AppointmentRole = 'patient' | 'doctor';

const statusVariant = (status: string): 'success' | 'warning' | 'danger' => {
  if (['completed', 'done'].includes(status)) return 'success';
  if (['cancelled', 'missed'].includes(status)) return 'danger';
  return 'warning';
};

const MyAppointmentList: React.FC<{ role: AppointmentRole }> = ({ role }) => {
  const user = useAuthStore((state) => state.user);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);

      if (user?.role.toLowerCase() !== role) {
        setError('You are not authorized to view this appointment list.');
        setLoading(false);
        return;
      }

      try {
        const profilePath = role === 'patient' ? '/patients/me' : '/doctors/me';
        const profileResponse = await api.get(profilePath) as {
          data?: { patientId?: string; doctorId?: string };
        };
        const profileId = role === 'patient'
          ? profileResponse.data?.patientId
          : profileResponse.data?.doctorId;
        if (!profileId) {
          throw new Error(`No ${role} profile is linked to your account. Please contact an administrator.`);
        }

        const response = await api.get(`/appointments/${role}/${encodeURIComponent(profileId)}`) as {
          data?: Appointment[];
        };
        if (!cancelled) {
          setAppointments(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setAppointments([]);
          setError(err instanceof Error ? err.message : 'Failed to load appointments');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAppointments();
    return () => {
      cancelled = true;
    };
  }, [role, user?.role]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  const counterpartLabel = role === 'patient' ? 'Doctor ID' : 'Patient ID';

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">My Appointments</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            {role === 'patient'
              ? 'View appointments booked for your patient profile.'
              : 'View appointments where you are the treating doctor.'}
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading appointments...</span>
          </div>
        )}
        {!loading && error && (
          <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm">{error}</div>
        )}
        {!loading && !error && (
          <Card className="!p-0 overflow-hidden">
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-textSecondary text-sm">No appointments scheduled yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background border-b border-textPrimary/10 text-xs uppercase font-semibold text-textSecondary">
                    <tr>
                      <th className="px-6 py-3">{counterpartLabel}</th>
                      <th className="px-6 py-3">Date &amp; Time</th>
                      <th className="px-6 py-3">Notes</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-textPrimary">
                    {appointments.map((appointment) => (
                      <tr key={appointment.appointmentId} className="hover:bg-primary/5">
                        <td className="px-6 py-4 font-medium">
                          {role === 'patient' ? appointment.doctorId : appointment.patientId}
                        </td>
                        <td className="px-6 py-4 text-textSecondary">
                          {new Date(appointment.appointmentDate).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-textSecondary">{appointment.notes || '—'}</td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant(appointment.status)}>{appointment.status || 'scheduled'}</Badge>
                        </td>
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

export const PatientAppointmentListPage: React.FC = () => <MyAppointmentList role="patient" />;
export const DoctorAppointmentListPage: React.FC = () => <MyAppointmentList role="doctor" />;
