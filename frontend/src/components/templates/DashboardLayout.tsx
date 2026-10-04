// Provides shared navigation and optional spoken critical alerts.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  Activity,
  FileText,
  CreditCard,
  Pill,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ClipboardList,
  FlaskConical,
  Receipt,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAlerts } from '../../shared/hooks/useAlerts';
import { ANIMATION } from '../../shared/utils/constants';
import { socket } from '../../shared/services/socket';
import { useSpeech } from '../../shared/hooks/useSpeech';
import { useVoiceStore } from '../../store/voiceStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeBarRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isInitialMount = useRef(true);
  const autoAlerts = useVoiceStore((state) => state.autoAlerts);
  const setAutoAlerts = useVoiceStore((state) => state.setAutoAlerts);
  const { speak, isSupported, message: speechMessage } = useSpeech();

  useAlerts();

  // Speak only critical socket notifications and keep the alert message factual.
  useEffect(() => {
    if (!autoAlerts) return;
    const handleVoiceNotification = (data: unknown) => {
      const notification = data && typeof data === 'object'
        ? data as Record<string, unknown>
        : null;
      const alertText = typeof data === 'string'
        ? data
        : typeof notification?.message === 'string'
          ? notification.message
          : '';
      const critical = notification?.type === 'critical' || alertText.toLowerCase().includes('critical');
      if (!critical || !alertText) return;

      const nestedPatient = notification?.patient && typeof notification.patient === 'object'
        ? notification.patient as Record<string, unknown>
        : null;
      const nestedPatientName = nestedPatient
        ? [nestedPatient.firstName, nestedPatient.lastName]
          .filter((part): part is string => typeof part === 'string')
          .join(' ')
        : '';
      const directName = typeof notification?.patientName === 'string'
        ? notification.patientName
        : typeof nestedPatient?.fullName === 'string'
          ? nestedPatient.fullName
          : typeof nestedPatient?.name === 'string'
            ? nestedPatient.name
            : nestedPatientName;
      const nameFromText =
        /patient(?: name)?\s*[:=-]\s*([A-Za-z][A-Za-z\s'-]+)/i.exec(alertText)?.[1]?.trim()
        || /\bfor\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/.exec(alertText)?.[1]?.trim();
      const patientName = directName || nameFromText;
      const englishAlert = patientName
        ? `Critical notification for ${patientName}. ${alertText}`
        : `Critical notification. ${alertText}`;
      const language = useVoiceStore.getState().language;
      const spokenAlert = language === 'ur'
        ? patientName
          ? `مریض ${patientName} کے لیے تشویشناک اطلاع۔`
          : 'تشویشناک طبی اطلاع موصول ہوئی۔'
        : englishAlert;
      speak(spokenAlert, language, englishAlert);
    };

    socket.on('notification', handleVoiceNotification);
    return () => {
      socket.off('notification', handleVoiceNotification);
    };
  }, [autoAlerts, speak]);

  // Content fade-in on mount and route changes
  useEffect(() => {
    if (!contentRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const duration = isInitialMount.current
      ? ANIMATION.LAYOUT.INITIAL_DURATION
      : ANIMATION.LAYOUT.ROUTE_DURATION;
    isInitialMount.current = false;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: ANIMATION.LAYOUT.INITIAL_Y },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: ANIMATION.EASING.GSAP,
        }
      );
    }, contentRef);

    return () => ctx.revert();
  }, [location.pathname]);

  // Sidebar active indicator animation
  useEffect(() => {
    const activeLink = navRef.current?.querySelector('a.active') as HTMLElement | null;
    if (!activeLink || !activeBarRef.current) return;

    const top = activeLink.offsetTop;
    const height = activeLink.offsetHeight;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(activeBarRef.current, { y: top, height, opacity: 1 });
      } else {
        gsap.to(activeBarRef.current, {
          y: top,
          height,
          opacity: 1,
          duration: ANIMATION.ACTIVE_BAR.DURATION,
          ease: ANIMATION.EASING.GSAP,
        });
      }
    });

    return () => ctx.revert();
  }, [location.pathname]);

  // Mobile sidebar open/close animation
  useEffect(() => {
    if (!mobileSidebarRef.current || !overlayRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (mobileOpen) {
        overlayRef.current!.style.display = 'block';
        if (prefersReducedMotion) {
          gsap.set(mobileSidebarRef.current, { x: '0%' });
          gsap.set(overlayRef.current, { opacity: 1 });
        } else {
          gsap.to(mobileSidebarRef.current, {
            x: '0%',
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
          });
          gsap.to(overlayRef.current, {
            opacity: 1,
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
          });
        }
      } else {
        if (prefersReducedMotion) {
          gsap.set(mobileSidebarRef.current, { x: '-100%' });
          gsap.set(overlayRef.current, { opacity: 0 });
          overlayRef.current!.style.display = 'none';
        } else {
          gsap.to(mobileSidebarRef.current, {
            x: '-100%',
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
          });
          gsap.to(overlayRef.current, {
            opacity: 0,
            duration: ANIMATION.SIDEBAR.DURATION,
            ease: ANIMATION.EASING.GSAP,
            onComplete: () => {
              if (overlayRef.current) overlayRef.current.style.display = 'none';
            },
          });
        }
      }
    });

    return () => ctx.revert();
  }, [mobileOpen]);

  // ─── Role-based navigation ────────────────────────────────────────────────
  const navItems = useMemo(() => {
    const role = user?.role?.toLowerCase();

    if (role === 'doctor') {
      return [
        { label: 'Dashboard',        path: '/dashboard',      icon: LayoutDashboard },
        { label: 'My Patients',      path: '/patients',       icon: Users            },
        { label: 'My Appointments',  path: '/appointments',   icon: Calendar         },
        { label: 'Vitals',           path: '/vitals',         icon: Activity         },
        { label: 'Prescriptions',    path: '/prescriptions',  icon: FileText         },
        { label: 'Medical Records',  path: '/medical-records',icon: ClipboardList    },
        { label: 'Lab Reports',      path: '/lab-reports',    icon: FlaskConical     },
      ];
    }

    if (role === 'patient') {
      return [
        { label: 'My Profile',       path: '/portal',         icon: UserIcon         },
        { label: 'My Appointments',  path: '/appointments',   icon: Calendar         },
        { label: 'My Vitals',        path: '/vitals',         icon: Activity         },
        { label: 'My Prescriptions', path: '/prescriptions',  icon: FileText         },
        { label: 'My Lab Reports',   path: '/lab-reports',    icon: FlaskConical     },
        { label: 'My Bills',         path: '/billing',        icon: Receipt          },
      ];
    }

    // Default: admin (or any unrecognized role) sees everything
    return [
      { label: 'Dashboard',      path: '/dashboard',       icon: LayoutDashboard },
      { label: 'Patients',       path: '/patients',        icon: Users            },
      { label: 'Doctors',        path: '/doctors',         icon: Stethoscope      },
      { label: 'Appointments',   path: '/appointments',    icon: Calendar         },
      { label: 'Prescriptions',  path: '/prescriptions',   icon: FileText         },
      { label: 'Medical Records',path: '/medical-records', icon: ClipboardList    },
      { label: 'Lab Reports',    path: '/lab-reports',     icon: FlaskConical     },
      { label: 'Billing',        path: '/billing',         icon: CreditCard       },
      { label: 'Pharmacy',       path: '/pharmacy',        icon: Pill             },
    ];
  }, [user?.role]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {

    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      <div
        ref={overlayRef}
        onClick={() => setMobileOpen(false)}
        className="fixed inset-0 bg-textPrimary/40 z-40 md:hidden"
        style={{ display: 'none', opacity: 0 }}
      />

      {/* Mobile sidebar */}
      <aside
        ref={mobileSidebarRef}
        className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-textPrimary/10 bg-surface md:hidden"
        style={{ transform: 'translateX(-100%)' }}
      >
        <div className="flex h-16 items-center justify-between border-b border-textPrimary/10 px-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-surface font-bold text-lg">
              +
            </div>
            <span className="font-bold text-lg text-textPrimary tracking-tight">MedSystem</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-textSecondary hover:text-textPrimary"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'active bg-primary/10 text-primary font-semibold'
                      : 'text-textSecondary hover:bg-primary/5 hover:text-textPrimary'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mx-4 mb-5 flex items-center justify-center gap-2 rounded-md border border-textPrimary/10 px-4 py-3 text-sm font-medium text-textPrimary hover:bg-background"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-textPrimary/10 bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-textPrimary/10 px-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-surface font-bold text-lg">
              +
            </div>
            <span className="font-bold text-lg text-textPrimary tracking-tight">MedSystem</span>
          </div>
        </div>
        <nav ref={navRef} className="relative flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {/* Active 2px indicator bar */}
          <div
            ref={activeBarRef}
            className="absolute left-0 w-[2px] bg-primary rounded-r pointer-events-none"
            style={{ top: 0, height: 0, opacity: 0 }}
          />
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'active bg-primary/10 text-primary font-semibold'
                      : 'text-textSecondary hover:bg-primary/5 hover:text-textPrimary'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex min-h-[72px] items-center justify-between border-b border-textPrimary/10 bg-surface px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-lg font-bold text-surface">
              +
            </div>
            <span className="truncate font-semibold text-textPrimary">MedSystem</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-4">
            <div className="flex flex-col items-start">
              <button
                type="button"
                aria-pressed={autoAlerts}
                disabled={!isSupported}
                onClick={() => setAutoAlerts(!autoAlerts)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                  autoAlerts
                    ? 'border-voicePrimary/20 bg-voicePrimary/10 text-voicePrimary'
                    : 'border-textPrimary/10 bg-surface text-textPrimary'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {autoAlerts ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Voice alerts {autoAlerts ? 'On' : 'Off'}
              </button>
              <span role="status" className="mt-0.5 max-w-44 text-[10px] text-textPrimary/70">
                {speechMessage || (isSupported
                  ? 'Off by default; critical notifications only.'
                  : 'Speech output is not supported by this browser.')}
              </span>
            </div>
            <div className="flex items-center">
              <div className="max-w-32 text-right text-xs sm:max-w-48">
                <p className="font-semibold text-textPrimary">
                  {user?.name || user?.username || 'Staff Member'}
                </p>
                <span
                  className="mt-0.5 inline-block rounded bg-voicePrimary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-voicePrimary"
                >
                  {user?.role || 'clinical'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(user?.role?.toLowerCase() === 'patient' ? '/portal' : '/dashboard')}
              aria-label="Open profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-textPrimary text-surface hover:bg-textPrimary/90"
            >
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia('(max-width: 767px)').matches) setMobileOpen(true);
                else handleLogout();
              }}
              aria-label={typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
                ? 'Open menu'
                : 'Log out'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-textPrimary text-surface hover:bg-textPrimary/90"
            >
              <Menu className="h-4 w-4 md:hidden" aria-hidden="true" />
              <LogOut className="hidden h-4 w-4 md:block" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main ref={contentRef} className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto w-full max-w-[1100px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
