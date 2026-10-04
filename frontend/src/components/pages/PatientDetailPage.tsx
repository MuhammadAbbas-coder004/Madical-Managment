import React, { useRef,  useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, User } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface PatientDetails {
  patientId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
}

export const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const fetch = async () => {
      try {
        const res = await api.get(`/patients/${patientId}`) as { data?: PatientDetails } | PatientDetails;
        setPatient((res as { data?: PatientDetails }).data || res as PatientDetails);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load patient details');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [patientId]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="max-w-3xl mx-auto">
        <Link to="/patients" className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Patients List
        </Link>
        {loading && <div className="flex items-center justify-center py-20 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading patient record...</span></div>}
        {!loading && error && <div className="p-4 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">{error}</div>}
        {!loading && patient && (
          <Card>
            <div className="flex items-center space-x-4 pb-6 border-b border-border">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-textPrimary">{patient.fullName || `${patient.firstName} ${patient.lastName}`}</h1>
                <p className="text-xs text-textSecondary mt-0.5">Patient ID: <span className="font-mono text-textPrimary">{patient.patientId}</span></p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-textSecondary shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold uppercase text-textSecondary">Email</p><p className="text-sm font-medium text-textPrimary">{patient.email}</p></div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-textSecondary shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold uppercase text-textSecondary">Phone Number</p><p className="text-sm font-medium text-textPrimary">{patient.phone || 'Not provided'}</p></div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-textSecondary shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold uppercase text-textSecondary">Date of Birth</p><p className="text-sm font-medium text-textPrimary">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}</p></div>
              </div>
            </div>
          </Card>
        )}
      </div>
          </div>
    </DashboardLayout>
  );
};
