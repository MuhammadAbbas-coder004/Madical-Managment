import React from 'react';
import { BadgeCheck, Mail, Phone, Stethoscope, UserRound } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../molecules/Card';
import { DashboardLayout } from '../templates/DashboardLayout';

export const DoctorProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">My Profile</h1>
          <p className="mt-1 text-sm text-textSecondary">Account details associated with your signed-in profile.</p>
        </header>
        <Card className="doctor-profile-card">
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <UserRound className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-textPrimary">{user?.name || user?.username || 'Doctor'}</h2>
              <p className="mt-1 text-sm text-textSecondary">{user?.specialty || 'Medical professional'}</p>
            </div>
            <span className={`doctor-profile-status ${user?.doctorVerificationStatus || 'unknown'}`}>
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {(user?.doctorVerificationStatus || 'status unavailable').replace('_', ' ')}
            </span>
          </div>
          <dl className="grid gap-5 pt-6 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Email</dt>
                <dd className="mt-1 break-all text-sm text-textPrimary">{user?.email || 'Not provided'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Phone</dt>
                <dd className="mt-1 text-sm text-textPrimary">{user?.phoneNumber || user?.phone || 'Not provided'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Specialty</dt>
                <dd className="mt-1 text-sm text-textPrimary">{user?.specialty || 'Not provided'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">License number</dt>
                <dd className="mt-1 text-sm text-textPrimary">{user?.licenseNumber || 'Not provided'}</dd>
              </div>
            </div>
          </dl>
        </Card>
      </div>
    </DashboardLayout>
  );
};
