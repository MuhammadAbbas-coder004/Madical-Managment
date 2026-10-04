import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Users, Stethoscope, Calendar, Clock, AlertTriangle } from 'lucide-react';
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
    gsap.to(counter, {
      val: value,
      duration: 0.8,
      ease: 'power1.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(counter.val).toLocaleString();
      },
    });
  }, [value]);
  return <span ref={ref}>0</span>;
};

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
    fetchStats();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textPrimary">Dashboard Overview</h1>
        <p className="text-sm text-textSecondary mt-1">Hospital activity, appointments, and patient alerts summary.</p>
      </div>
      {loading && (
        <div className="flex items-center justify-center py-20 text-primary">
          <Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading statistics...</span>
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-danger">{error}</div>
      )}
      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-textSecondary">Total Patients</p>
                <p className="text-2xl font-bold text-textPrimary mt-1"><AnimatedNumber value={stats.totalPatients} /></p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl"><Users className="w-5 h-5" /></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-textSecondary">Total Doctors</p>
                <p className="text-2xl font-bold text-textPrimary mt-1"><AnimatedNumber value={stats.totalDoctors} /></p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Stethoscope className="w-5 h-5" /></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-textSecondary">Total Appointments</p>
                <p className="text-2xl font-bold text-textPrimary mt-1"><AnimatedNumber value={stats.totalAppointments} /></p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-textSecondary">Today&apos;s Schedule</p>
                <p className="text-2xl font-bold text-textPrimary mt-1"><AnimatedNumber value={stats.appointmentsToday} /></p>
              </div>
              <div className="p-3 bg-amber-50 text-warning rounded-xl"><Clock className="w-5 h-5" /></div>
            </div>
          </Card>
          <Card className={stats.criticalVitalsCount > 0 ? 'border-danger/30 bg-red-50/40' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-danger">Critical Vitals</p>
                <p className="text-2xl font-bold text-danger mt-1"><AnimatedNumber value={stats.criticalVitalsCount} /></p>
              </div>
              <div className="p-3 bg-red-100 text-danger rounded-xl"><AlertTriangle className="w-5 h-5" /></div>
            </div>
          </Card>
        </div>
      )}
          </div>
    </DashboardLayout>
  );
};
