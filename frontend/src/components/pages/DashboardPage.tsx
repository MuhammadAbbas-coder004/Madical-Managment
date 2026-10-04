// Shows a quick, readable overview of today's clinic activity.
import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Calendar, CircleAlert, Users } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  appointmentsToday: number;
  criticalVitalsCount: number;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const counter = { val: 0 };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      ref.current.textContent = Math.round(value).toLocaleString();
      return;
    }

    const tween = gsap.to(counter, {
      val: value,
      duration: 0.8,
      ease: 'power1.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(counter.val).toLocaleString();
      },
    });
    return () => {
      tween.kill();
    };
  }, [value]);

  return <span ref={ref}>0</span>;
};

const ArrowLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to} className="card-arrow mt-auto self-end" aria-label={label}>
    <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
  </Link>
);

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/dashboard/stats') as DashboardStats;
        setStats(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };
    void fetchStats();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-textSecondary">
            Overview
          </p>
          <h1 className="dashboard-title text-[36px] font-medium leading-tight text-textPrimary sm:text-[40px]">
            Today at the clinic
          </h1>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-20 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading statistics...</span>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-5 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && !stats && (
          <div className="rounded-xl border border-textPrimary/10 bg-surface p-8 text-center text-sm text-textSecondary">
            No dashboard data found.
          </div>
        )}

        {!loading && stats && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="flex min-h-[390px] flex-col rounded-xl border-textPrimary/10 p-6 sm:p-7 md:row-span-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Clinic overview</span>
                </div>
                <h2 className="text-2xl font-medium text-textPrimary">Your care team, at a glance</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-textSecondary">
                  A simple snapshot of patient activity and the work scheduled for today.
                </p>
              </div>

              <div className="mt-8 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                <div className="min-h-[112px] rounded-xl border border-textPrimary/10 bg-background p-4">
                  <div className="flex items-center gap-2 text-textPrimary">
                    <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-xs font-medium">Patients</span>
                  </div>
                  <p className="mt-4 text-3xl font-medium text-textPrimary">
                    <AnimatedNumber value={stats.totalPatients} />
                  </p>
                </div>
                <div className="min-h-[112px] rounded-xl border border-textPrimary/10 bg-background p-4">
                  <div className="flex items-center gap-2 text-textPrimary">
                    <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-xs font-medium">Appointments today</span>
                  </div>
                  <p className="mt-4 text-3xl font-medium text-textPrimary">
                    <AnimatedNumber value={stats.appointmentsToday} />
                  </p>
                </div>
                <div className={`min-h-[112px] rounded-xl border p-4 ${
                  stats.criticalVitalsCount > 0
                    ? 'border-danger/40 bg-danger/10'
                    : 'border-textPrimary/10 bg-background'
                }`}>
                  <div className="flex items-center gap-2 text-textPrimary">
                    <AlertTriangle
                      className={`h-4 w-4 ${stats.criticalVitalsCount > 0 ? 'text-danger' : 'text-primary'}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium">Critical vitals</span>
                  </div>
                  <p className={`mt-4 text-3xl font-medium ${
                    stats.criticalVitalsCount > 0 ? 'text-danger' : 'text-textPrimary'
                  }`}>
                    <AnimatedNumber value={stats.criticalVitalsCount} />
                  </p>
                </div>
              </div>

              <ArrowLink to="/patients" label="Open patients" />
            </Card>

            <Card className="flex min-h-[185px] flex-col rounded-xl border-textPrimary/10 p-6 sm:p-7">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <CircleAlert className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-textPrimary">Critical alerts</h2>
                  <p className="mt-2 text-4xl font-medium text-danger">
                    <AnimatedNumber value={stats.criticalVitalsCount} />
                  </p>
                  <p className="mt-1 text-sm text-textSecondary">
                    {stats.criticalVitalsCount} {stats.criticalVitalsCount === 1 ? 'patient needs' : 'patients need'} a doctor now
                  </p>
                </div>
              </div>
              <ArrowLink to="/vitals" label="Review critical vitals" />
            </Card>

            <Card className="flex min-h-[185px] flex-col rounded-xl border-textPrimary/10 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-medium text-textPrimary">Appointments</h2>
                  </div>
                  <p className="mt-2 text-sm text-textSecondary">
                    {stats.appointmentsToday} scheduled today
                  </p>
                </div>
                <p className="text-3xl font-medium text-textPrimary">
                  <AnimatedNumber value={stats.appointmentsToday} />
                </p>
              </div>

              <div
                className="relative my-6 flex items-center justify-between before:absolute before:left-2 before:right-2 before:top-1/2 before:h-px before:bg-textPrimary/10"
                role="img"
                aria-label="Appointment timeline"
              >
                {Array.from({ length: 7 }, (_, index) => (
                  <span
                    key={index}
                    className={`relative z-10 block rounded-full ${
                      index < 2
                        ? 'h-2 w-2 bg-textPrimary/40'
                        : index === 2
                          ? 'h-4 w-4 bg-primary ring-4 ring-primary/10'
                          : 'h-2.5 w-2.5 bg-primary'
                    }`}
                  />
                ))}
              </div>
              <ArrowLink to="/appointments" label="Open appointments" />
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
