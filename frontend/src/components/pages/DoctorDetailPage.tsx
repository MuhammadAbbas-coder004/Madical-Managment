import React, { useRef,  useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Stethoscope, Award } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface DoctorDetails { doctorId: string; firstName: string; lastName: string; fullName?: string; email: string; phone: string; specialization: string; }

export const DoctorDetailPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<DoctorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    const fetch = async () => {
      try {
        const res = await api.get(`/doctors/${doctorId}`) as { data?: DoctorDetails } | DoctorDetails;
        setDoctor((res as { data?: DoctorDetails }).data || res as DoctorDetails);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load doctor profile'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [doctorId]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="max-w-3xl mx-auto">
        <Link to="/doctors" className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Doctors List
        </Link>
        {loading && <div className="flex items-center justify-center py-20 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading physician profile...</span></div>}
        {!loading && error && <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm">{error}</div>}
        {!loading && !error && !doctor && (
          <div className="p-8 text-center text-textSecondary text-sm">No doctor data found.</div>
        )}
        {!loading && doctor && (
          <Card>
            <div className="flex items-center space-x-4 pb-6 border-b border-border">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-textPrimary">Dr. {doctor.fullName || `${doctor.firstName} ${doctor.lastName}`}</h1>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">{doctor.specialization}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="flex items-start space-x-3">
                <Award className="w-5 h-5 text-textSecondary shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold uppercase text-textSecondary">Doctor ID</p><p className="text-sm font-mono font-medium text-textPrimary">{doctor.doctorId}</p></div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-textSecondary shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold uppercase text-textSecondary">Email</p><p className="text-sm font-medium text-textPrimary">{doctor.email}</p></div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-textSecondary shrink-0 mt-0.5" />
                <div><p className="text-xs font-semibold uppercase text-textSecondary">Phone Number</p><p className="text-sm font-medium text-textPrimary">{doctor.phone || 'Not provided'}</p></div>
              </div>
            </div>
          </Card>
        )}
      </div>
          </div>
    </DashboardLayout>
  );
};
