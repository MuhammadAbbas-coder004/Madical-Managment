import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight, BadgeCheck, CircleX } from 'lucide-react';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { SearchBar } from '../molecules/SearchBar';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'not_applicable';

interface Doctor {
  doctorId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  specialization?: string;
  licenseNumber?: string;
  doctorVerificationStatus?: VerificationStatus;
}

export const DoctorListPage: React.FC = () => {
  const isAdmin = useAuthStore((state) => state.user?.role.toLowerCase() === 'admin');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [updatingDoctorId, setUpdatingDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/doctors') as Doctor[] | { data: Doctor[] };
        setDoctors(Array.isArray(res) ? res : (res as { data: Doctor[] }).data || []);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load doctors'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = doctors.filter((d) => {
    const q = searchQuery.toLowerCase();
    return `${d.fullName || `${d.firstName || ''} ${d.lastName || ''}`} ${d.specialization || ''} ${d.email}`
      .toLowerCase()
      .includes(q);
  });

  const updateVerification = async (doctorId: string, status: 'verified' | 'rejected') => {
    setUpdatingDoctorId(doctorId);
    setVerificationError(null);
    try {
      const response = await api.patch(`/doctors/${encodeURIComponent(doctorId)}/verification`, { status }) as {
        data?: { doctorVerificationStatus?: VerificationStatus };
      };
      const savedStatus = response.data?.doctorVerificationStatus;
      if (savedStatus !== status) {
        throw new Error('The server did not confirm the verification status update.');
      }
      setDoctors((current) => current.map((doctor) =>
        doctor.doctorId === doctorId
          ? { ...doctor, doctorVerificationStatus: savedStatus }
          : doctor
      ));
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Unable to update doctor verification.');
    } finally {
      setUpdatingDoctorId(null);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Doctors Directory</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            Manage hospital medical staff and physician specialties.
            {isAdmin && ' Review credentials before changing a doctor’s clinical access.'}
          </p>
        </div>
        <Link to="/doctors/new" className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-surface px-4 py-2 rounded-md transition-colors shadow-sm">
          <Stethoscope className="w-4 h-4 mr-2" />Add Doctor
        </Link>
      </div>
      <div className="mb-6 max-w-md">
        <SearchBar value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by doctor name or specialty..." />
      </div>
      {loading && <div className="flex items-center justify-center py-16 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading doctors...</span></div>}
      {!loading && error && <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm mb-6">{error}</div>}
      {!loading && verificationError && <div role="alert" className="mb-4 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{verificationError}</div>}
      {!loading && !error && (
        <Card className="!p-0 overflow-hidden">
          {filtered.length === 0
            ? <div className="p-8 text-center text-textSecondary text-sm">No doctors found.</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background border-b border-textPrimary/10 text-xs uppercase font-semibold text-textSecondary">
                    <tr>
                      <th className="px-6 py-3">Doctor Name</th>
                      <th className="px-6 py-3">Specialization</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Phone</th>
                      {isAdmin && (
                        <>
                          <th className="px-6 py-3">License number</th>
                          <th className="px-6 py-3">Verification</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-textPrimary">
                    {filtered.map((d) => (
                      <tr key={d.doctorId} className="hover:bg-primary/5">
                        <td className="px-6 py-4 font-medium">Dr. {(d.fullName || `${d.firstName || ''} ${d.lastName || ''}`).replace(/^Dr\.\s*/i, '')}</td>
                        <td className="px-6 py-4"><span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">{d.specialization || 'Not provided'}</span></td>
                        <td className="px-6 py-4 text-textSecondary">{d.email}</td>
                        <td className="px-6 py-4 text-textSecondary">{d.phone || 'N/A'}</td>
                        {isAdmin && (
                          <>
                            <td className="px-6 py-4 font-mono text-xs text-textSecondary">{d.licenseNumber || 'Not provided'}</td>
                            <td className="px-6 py-4">
                              <div className="flex min-w-44 flex-col items-start gap-2">
                                <span className={`doctor-verification-label ${d.doctorVerificationStatus || 'not_applicable'}`}>
                                  {d.doctorVerificationStatus === 'verified'
                                    ? 'Verified'
                                    : d.doctorVerificationStatus === 'pending'
                                      ? 'Pending review'
                                      : d.doctorVerificationStatus === 'rejected'
                                        ? 'Rejected'
                                        : 'No linked account'}
                                </span>
                                {d.doctorVerificationStatus === 'pending' && (
                                  <span className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={updatingDoctorId === d.doctorId}
                                      onClick={() => void updateVerification(d.doctorId, 'verified')}
                                      className="doctor-verification-action approve"
                                      title="Mark verified only after reviewing the doctor's credentials"
                                    >
                                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingDoctorId === d.doctorId}
                                      onClick={() => void updateVerification(d.doctorId, 'rejected')}
                                      className="doctor-verification-action reject"
                                    >
                                      <CircleX className="h-3.5 w-3.5" aria-hidden="true" />
                                      Reject
                                    </button>
                                  </span>
                                )}
                                {updatingDoctorId === d.doctorId && (
                                  <span role="status" className="text-xs text-textSecondary">Saving status…</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 text-right">
                          <Link to={`/doctors/${d.doctorId}`} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                            View Profile<ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
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
