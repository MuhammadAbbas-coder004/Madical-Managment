import React, { useRef,  useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Pill,
  Clock,
} from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface PatientPortalData {
  patient: {
    patientId: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
  };
  appointments?: Array<{
    appointmentId: string;
    appointmentDate: string;
    status: string;
    notes?: string;
  }>;
  prescriptions?: Array<{
    prescriptionId: string;
    diagnosis: string;
    createdAt: string;
    medicines: Array<{
      name: string;
      dosage: string;
      duration: string;
      instructions: string;
    }>;
  }>;
  vitals?: Array<{
    vitalsId: string;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    heartRate: number;
    sugarLevel: number;
    temperature: number;
    recordedAt: string;
    analysis?: {
      status?: 'normal' | 'warning' | 'critical';
    };
  }>;
}

interface ApiList<T> {
  data?: T[];
}

const getList = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray(response.data)
  ) {
    return response.data as T[];
  }
  return [];
};

export const PatientPortalPage: React.FC = () => {
  const [data, setData] = useState<PatientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPortalData = async () => {
      try {
        setLoading(true);
        const profileResponse = await api.get('/patients/me') as {
          data?: PatientPortalData['patient'];
        };
        if (!profileResponse.data?.patientId) {
          throw new Error('No patient profile is linked to your account.');
        }

        const patientId = encodeURIComponent(profileResponse.data.patientId);
        const [appointmentsResponse, prescriptionsResponse, vitalsResponse] = await Promise.all([
          api.get(`/appointments/patient/${patientId}`) as Promise<ApiList<NonNullable<PatientPortalData['appointments']>[number]>>,
          api.get(`/prescriptions/patient/${patientId}`) as Promise<ApiList<NonNullable<PatientPortalData['prescriptions']>[number]>>,
          api.get(`/vitals/patient/${patientId}`) as Promise<ApiList<NonNullable<PatientPortalData['vitals']>[number]>>,
        ]);

        if (!cancelled) {
          setData({
            patient: profileResponse.data,
            appointments: getList(appointmentsResponse),
            prescriptions: getList(prescriptionsResponse),
            vitals: getList(vitalsResponse),
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Failed to load patient portal records');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPortalData();
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
        <h1 className="text-2xl font-bold text-textPrimary">My Patient Health Portal</h1>
        <p className="text-sm text-textSecondary mt-0.5">
          Review your personal records, upcoming consultations, medications, and vitals.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-primary">
          <Spinner size="lg" />
          <span className="ml-3 text-sm text-textSecondary">Loading your health records...</span>
        </div>
      )}

      {!loading && error && (
        <div className="mb-6 rounded-md border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && !data && (
        <Card>
          <p className="text-center text-textSecondary text-sm py-4">No patient data found.</p>
        </Card>
      )}

      {!loading && data && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-textPrimary">
                    {data.patient.fullName || `${data.patient.firstName || ''} ${data.patient.lastName || ''}`}
                  </h2>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Patient ID: <span className="font-mono text-textPrimary">{data.patient.patientId}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-textSecondary border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-textPrimary font-medium">{data.patient.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-textPrimary font-medium">{data.patient.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    DOB:{' '}
                    <strong className="text-textPrimary">
                      {data.patient.dateOfBirth
                        ? new Date(data.patient.dateOfBirth).toLocaleDateString()
                        : 'Not recorded'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="My Scheduled Appointments">
              {(!data.appointments || data.appointments.length === 0) ? (
                <p className="text-xs text-textSecondary py-4 text-center">
                  No appointments scheduled.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.appointments.map((appt) => (
                    <div
                      key={appt.appointmentId}
                      className="flex items-center justify-between rounded-md border border-textPrimary/10 bg-background p-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-textPrimary flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {new Date(appt.appointmentDate).toLocaleString()}
                        </div>
                        {appt.notes && (
                          <p className="text-textSecondary mt-1 italic">
                            "{appt.notes}"
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          appt.status === 'CANCELLED'
                            ? 'danger'
                            : appt.status === 'COMPLETED'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {appt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="My Active Prescriptions">
              {(!data.prescriptions || data.prescriptions.length === 0) ? (
                <p className="text-xs text-textSecondary py-4 text-center">
                  No active prescriptions on file.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.prescriptions.map((presc) => (
                    <div
                      key={presc.prescriptionId}
                      className="rounded-md border border-textPrimary/10 bg-background p-3 text-xs"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-textPrimary">
                          {presc.diagnosis}
                        </span>
                        <span className="text-textSecondary">
                          {new Date(presc.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {presc.medicines?.map((med, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-textSecondary bg-white p-1.5 rounded border border-border/60"
                          >
                            <Pill className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-medium text-textPrimary">{med.name}</span>
                            <span>• {med.dosage}</span>
                            <span>({med.duration})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Recent Biometric Vitals">
            {(!data.vitals || data.vitals.length === 0) ? (
              <p className="text-xs text-textSecondary py-4 text-center">
                No recent vitals recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background border-b border-textPrimary/10 font-semibold text-textSecondary">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Blood Pressure</th>
                      <th className="py-2.5 px-3">Heart Rate</th>
                      <th className="py-2.5 px-3">Blood Sugar</th>
                      <th className="py-2.5 px-3">Temperature</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-textPrimary">
                    {data.vitals.map((v) => (
                      <tr key={v.vitalsId}>
                        <td className="py-2.5 px-3">
                          {new Date(v.recordedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg
                        </td>
                        <td className="py-2.5 px-3">{v.heartRate} bpm</td>
                        <td className="py-2.5 px-3">{v.sugarLevel} mg/dL</td>
                        <td className="py-2.5 px-3">{v.temperature}°F</td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge
                            variant={
                              v.analysis?.status === 'critical'
                                ? 'danger'
                                : v.analysis?.status === 'warning'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {(v.analysis?.status || 'NORMAL').toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
          </div>
    </DashboardLayout>
  );
};
