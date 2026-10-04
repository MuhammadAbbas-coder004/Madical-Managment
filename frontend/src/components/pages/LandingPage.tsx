// Introduces the public pages and real workflows available in MedSystem.
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileText,
  HeartPulse,
  Hospital,
  Pill,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { Card } from '../molecules/Card';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

const features = [
  {
    icon: Users,
    title: 'Patient records',
    description: 'Keep patient details and clinical records together.',
  },
  {
    icon: HeartPulse,
    title: 'Vitals checker with critical alerts',
    description: 'Review rule-based readings and receive critical alerts.',
  },
  {
    icon: CalendarDays,
    title: 'Appointments',
    description: 'Create and review appointments by role.',
  },
  {
    icon: FileText,
    title: 'Prescriptions',
    description: 'Record prescriptions and their medicines.',
  },
  {
    icon: CreditCard,
    title: 'Billing',
    description: 'Create invoices and review billing records.',
  },
  {
    icon: Pill,
    title: 'Pharmacy',
    description: 'Manage the pharmacy medicine stock list.',
  },
];

const steps = [
  'Register and sign in',
  "Record the patient's vitals",
  'Get an alert when a reading is critical',
];

const roles = [
  { title: 'Admin', description: 'Manage clinic records and system workflows.' },
  { title: 'Doctor', description: 'Review patient records and record vitals.' },
  { title: 'Nurse', description: 'Support patient care and clinical workflows.' },
  { title: 'Patient', description: 'View your own appointments, reports and vitals.' },
];

const copyrightYear = new Date().getFullYear();

export const LandingPage: React.FC = () => {
  const pageRef = useRef<HTMLDivElement>(null);
  useFadeUp(pageRef);

  return (
    <div ref={pageRef} className="min-h-screen bg-background">
      <header className="border-b border-textPrimary/10 bg-surface">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="inline-flex min-w-0 items-center gap-2 rounded-md text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-surface">
              <Hospital className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="truncate text-base font-semibold">MedSystem</span>
          </Link>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-textPrimary/10 bg-surface px-3 text-sm font-medium text-textPrimary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-4"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-surface hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-4"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-12 sm:px-6">
        <section aria-labelledby="landing-title" className="py-14 sm:py-20">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-textPrimary/60">
            Medical management system
          </p>
          <h1 id="landing-title" className="landing-title max-w-4xl text-[36px] font-medium leading-tight text-textPrimary sm:text-[44px]">
            Clinic records, vitals and prescriptions in one place
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-textPrimary/70">
            Manage clinical workflows with role-based access, patient records, appointments and a rule-based vitals checker.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-surface hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-textPrimary/10 bg-surface px-5 text-sm font-medium text-textPrimary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Login
            </Link>
          </div>
        </section>

        <section aria-labelledby="features-title" className="py-8">
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-textPrimary/60">Features</p>
            <h2 id="features-title" className="text-2xl font-medium text-textPrimary sm:text-3xl">
              Tools for everyday clinic workflows
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="min-h-[160px]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-medium text-textPrimary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-textPrimary/70">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="steps-title" className="py-10">
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-textPrimary/60">How it works</p>
            <h2 id="steps-title" className="text-2xl font-medium text-textPrimary sm:text-3xl">A simple care workflow</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step} className="flex min-h-[140px] items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="pt-1 text-base font-medium leading-6 text-textPrimary">{step}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="roles-title" className="py-8">
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-textPrimary/60">Role-based access</p>
            <h2 id="roles-title" className="text-2xl font-medium text-textPrimary sm:text-3xl">Workspaces for each role</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <Card key={role.title} className="min-h-[145px]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-textPrimary/10 bg-background text-textPrimary">
                  {role.title === 'Patient'
                    ? <UserRound className="h-4 w-4" aria-hidden="true" />
                    : role.title === 'Doctor'
                      ? <Activity className="h-4 w-4" aria-hidden="true" />
                      : role.title === 'Nurse'
                        ? <HeartPulse className="h-4 w-4" aria-hidden="true" />
                        : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                </div>
                <h3 className="text-base font-medium text-textPrimary">{role.title}</h3>
                <p className="mt-2 text-sm leading-6 text-textPrimary/70">{role.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-textPrimary/10 bg-surface">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 px-4 py-6 text-sm text-textPrimary/70 sm:px-6">
          <p>This system gives an automatic check, not a medical diagnosis. Please consult a doctor.</p>
          <p>© {copyrightYear} MedSystem</p>
        </div>
      </footer>
    </div>
  );
};
