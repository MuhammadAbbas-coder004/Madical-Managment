import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  appointmentId: string;
  patientId: string;
  appointmentDate: string;
  notes?: string;
  status: string;
}

interface VitalRecord {
  patientId: string;
  status?: string;
  heartRate?: number;
  bloodPressure?: string;
}

interface CriticalAlert {
  patientId: string;
  patientName: string;
  detail: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPatientName = (
  p: Appointment['patientId'],
  fallback = 'Unknown Patient'
): string => {
  if (typeof p === 'string') return fallback;
  const obj = p as { fullName?: string; firstName?: string; lastName?: string };
  return (
    obj.fullName ||
    `${obj.firstName || ''} ${obj.lastName || ''}`.trim() ||
    fallback
  );
};

const getPatientRawId = (p: Appointment['patientId']): string => {
  if (typeof p === 'string') return p;
  return (p as { _id?: string })._id ?? '';
};

const isToday = (dateStr: string): boolean => {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
};

const statusVariant = (status: string): 'success' | 'warning' | 'danger' => {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  valueCls?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, iconBg, valueCls }) => (
  <Card>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-textSecondary">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${valueCls ?? 'text-textPrimary'}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
    </div>
  </Card>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  // Step 1 — fetch this doctor's appointments
  useEffect(() => {
    if (user?.role.toLowerCase() !== 'doctor') {
      setAppointmentsError('You are not authorized to view this dashboard.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchAppointments = async () => {
      setLoading(true);
      setAppointmentsError(null);
      try {
        const profileResponse = await api.get('/doctors/me') as {
          data?: { doctorId?: string };
        };
        const doctorId = profileResponse.data?.doctorId;
        if (!doctorId) {
          throw new Error('No doctor profile is linked to your account. Please contact an administrator.');
        }

        const response = await api.get(`/appointments/doctor/${encodeURIComponent(doctorId)}`) as {
          data?: Appointment[];
        };
        if (!cancelled) {
          setAllAppointments(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setAllAppointments([]);
          setAppointmentsError(error instanceof Error ? error.message : 'Failed to load appointments');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchAppointments();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  // Step 2 — once appointments load, scan vitals for critical readings
  useEffect(() => {
    if (allAppointments.length === 0) return;

    const uniquePatientIds = Array.from(
      new Set(allAppointments.map((appointment) => getPatientRawId(appointment.patientId)))
    ).filter(Boolean);

    const fetchCriticalAlerts = async () => {
      setAlertsLoading(true);
      const alerts: CriticalAlert[] = [];

      await Promise.allSettled(
        uniquePatientIds.map(async (pid) => {
          try {
            const res: any = await api.get(`/vitals/patient/${pid}`);
            const vitals: VitalRecord[] = Array.isArray(res) ? res : res.data ?? [];
            const latest = vitals[0];
            if (latest && latest.status === 'critical') {
              const matchingAppt = allAppointments.find(
                (a) => getPatientRawId(a.patientId) === pid
              );
              const name = matchingAppt
                ? getPatientName(matchingAppt.patientId, pid)
                : pid;
              const detail = latest.bloodPressure
                ? `BP: ${latest.bloodPressure}${latest.heartRate ? `, HR: ${latest.heartRate} bpm` : ''}`
                : latest.heartRate
                ? `HR: ${latest.heartRate} bpm`
                : 'Critical readings recorded';
              alerts.push({ patientId: pid, patientName: name, detail });
            }
          } catch {
            // skip
          }
        })
      );

      setCriticalAlerts(alerts);
      setAlertsLoading(false);
    };

    fetchCriticalAlerts();
  }, [allAppointments]);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const todaysAppointments = allAppointments.filter((a) => isToday(a.appointmentDate));

  const uniquePatientCount = new Set(
    allAppointments.map((appointment) => getPatientRawId(appointment.patientId))
  ).size;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div ref={containerRef}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">
            Good morning, Dr. {user?.name || user?.username || 'Doctor'} 👋
          </h1>
          <p className="text-sm text-textSecondary mt-1">
            Your clinical summary for{' '}
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading your dashboard…</span>
          </div>
        )}

        {!loading && (
          <>
            {appointmentsError && (
              <div className="mb-6 rounded-md border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
                {appointmentsError}
              </div>
            )}
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Today's Appointments"
                value={todaysAppointments.length}
                icon={<Calendar className="w-5 h-5" />}
                iconBg="bg-primary/10 text-primary"
              />
              <StatCard
                label="Total Patients"
                value={uniquePatientCount}
                icon={<Users className="w-5 h-5" />}
                iconBg="bg-primary/10 text-primary"
              />
              <StatCard
                label="Critical Alerts"
                value={criticalAlerts.length}
                icon={<AlertTriangle className="w-5 h-5" />}
                iconBg={
                  criticalAlerts.length > 0
                    ? 'bg-danger/10 text-danger'
                    : 'bg-textPrimary/5 text-textSecondary'
                }
                valueCls={criticalAlerts.length > 0 ? 'text-danger' : 'text-textPrimary'}
              />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Today's Schedule (2/3 wide) */}
              <div className="lg:col-span-2">
                <Card
                  title="Today's Schedule"
                  subtitle={`${todaysAppointments.length} appointment${todaysAppointments.length !== 1 ? 's' : ''} today`}
                >
                  {todaysAppointments.length === 0 ? (
                    <div className="text-center py-10">
                      <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="text-sm text-textSecondary">
                        No appointments scheduled for today.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {todaysAppointments.map((appt) => (
                        <li
                          key={appt.appointmentId}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          {/* Time */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Clock className="w-4 h-4 text-textSecondary" />
                            <span className="text-sm font-medium text-textPrimary w-12">
                              {new Date(appt.appointmentDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Patient + reason */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-textPrimary truncate">
                              {getPatientName(appt.patientId)}
                            </p>
                            {appt.notes && (
                              <p className="text-xs text-textSecondary truncate">{appt.notes}</p>
                            )}
                          </div>

                          {/* Status */}
                          <Badge
                            variant={statusVariant(appt.status)}
                            className="shrink-0 capitalize"
                          >
                            {appt.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              {/* Right column: Alerts + Quick Actions */}
              <div className="flex flex-col gap-6">

                {/* Critical Alerts */}
                <Card
                  title="Critical Alerts"
                  subtitle="Patients with critical vitals"
                  className={criticalAlerts.length > 0 ? 'border-danger/40' : ''}
                >
                  {alertsLoading ? (
                    <div className="flex items-center gap-2 py-4 text-textSecondary text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking vitals…
                    </div>
                  ) : criticalAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-7 h-7 text-success mx-auto mb-2" />
                      <p className="text-sm text-textSecondary">All patients look stable.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {criticalAlerts.map((alert) => (
                        <li
                          key={alert.patientId}
                          className="flex items-start gap-3 rounded-md border border-danger/20 bg-danger/10 p-3"
                        >
                          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-danger truncate">
                              {alert.patientName}
                            </p>
                            <p className="text-xs text-danger mt-0.5">{alert.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                {/* Quick Actions */}
                <Card title="Quick Actions">
                  <div className="flex flex-col gap-3">
                    <Link to="/prescriptions/new">
                      <Button variant="primary" className="w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        Write Prescription
                      </Button>
                    </Link>
                    <Link to="/patients">
                      <Button variant="secondary" className="w-full">
                        <Users className="w-4 h-4 mr-2" />
                        View My Patients
                      </Button>
                    </Link>
                  </div>
                </Card>

              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
