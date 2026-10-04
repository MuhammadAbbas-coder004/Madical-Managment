import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../store/authStore';

// --- Auth Pages (Public) ---
import { LoginPage } from '../components/pages/LoginPage';
import { RegisterPage } from '../components/pages/RegisterPage';
import { FaceEnrollPage } from '../components/pages/FaceEnrollPage';
import { ForgotPasswordPage } from '../components/pages/ForgotPasswordPage';
import { VerifyOtpPage } from '../components/pages/VerifyOtpPage';
import { ResetPasswordPage } from '../components/pages/ResetPasswordPage';

// --- Clinical Modules (Protected) ---
import { DashboardPage } from '../components/pages/DashboardPage';
import { DoctorDashboardPage } from '../components/pages/DoctorDashboardPage';
import { PatientListPage } from '../components/pages/PatientListPage';
import { PatientCreatePage } from '../components/pages/PatientCreatePage';
import { PatientDetailPage } from '../components/pages/PatientDetailPage';
import { DoctorListPage } from '../components/pages/DoctorListPage';
import { DoctorCreatePage } from '../components/pages/DoctorCreatePage';
import { DoctorDetailPage } from '../components/pages/DoctorDetailPage';
import { AppointmentListPage } from '../components/pages/AppointmentListPage';
import { AppointmentBookPage } from '../components/pages/AppointmentBookPage';
import { VitalsRecordPage } from '../components/pages/VitalsRecordPage';
import { PatientVitalsPage } from '../components/pages/PatientVitalsPage';
import { PrescriptionListPage } from '../components/pages/PrescriptionListPage';
import { PrescriptionCreatePage } from '../components/pages/PrescriptionCreatePage';
import { MedicalRecordListPage } from '../components/pages/MedicalRecordListPage';
import { MedicalRecordCreatePage } from '../components/pages/MedicalRecordCreatePage';
import { LabReportListPage } from '../components/pages/LabReportListPage';
import { LabReportUploadPage } from '../components/pages/LabReportUploadPage';
import { PatientLabReportsPage } from '../components/pages/PatientLabReportsPage';
import { BillingListPage } from '../components/pages/BillingListPage';
import { BillingCreatePage } from '../components/pages/BillingCreatePage';
import { PharmacyListPage } from '../components/pages/PharmacyListPage';
import { PharmacyAddPage } from '../components/pages/PharmacyAddPage';
import { PatientPortalPage } from '../components/pages/PatientPortalPage';
import { DoctorAppointmentListPage, PatientAppointmentListPage } from '../components/pages/MyAppointmentListPage';

// Renders the correct dashboard based on the logged-in user's role
const RoleAwareDashboard: React.FC = () => {
  const { user } = useAuthStore();
  if (user?.role?.toLowerCase() === 'doctor') return <DoctorDashboardPage />;
  return <DashboardPage />;
};

const RoleAwareAppointmentList: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase();

  if (role === 'patient') return <PatientAppointmentListPage />;
  if (role === 'doctor') return <DoctorAppointmentListPage />;
  if (role === 'admin') return <AppointmentListPage />;
  return <Navigate to="/dashboard" replace />;
};

const RoleAwareLabReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase();

  if (role === 'patient') return <PatientLabReportsPage />;
  if (['doctor', 'nurse', 'admin'].includes(role || '')) return <LabReportListPage />;
  return <Navigate to="/dashboard" replace />;
};

const RoleAwareLabReportUploadPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase();

  if (['doctor', 'nurse', 'admin'].includes(role || '')) return <LabReportUploadPage />;
  return <Navigate to="/lab-reports" replace />;
};

const RoleAwareVitalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase();

  if (role === 'doctor') return <VitalsRecordPage />;
  if (role === 'patient') return <PatientVitalsPage />;
  return <Navigate to="/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 2. Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/face-enrollment-prompt" element={<FaceEnrollPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 3. Protected Clinical Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleAwareDashboard />
          </ProtectedRoute>
        }
      />

      {/* Patients Management */}
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/new"
        element={
          <ProtectedRoute>
            <PatientCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:patientId"
        element={
          <ProtectedRoute>
            <PatientDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Doctors Management */}
      <Route
        path="/doctors"
        element={
          <ProtectedRoute>
            <DoctorListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors/new"
        element={
          <ProtectedRoute>
            <DoctorCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors/:doctorId"
        element={
          <ProtectedRoute>
            <DoctorDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Appointments */}
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <RoleAwareAppointmentList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/book"
        element={
          <ProtectedRoute>
            <AppointmentBookPage />
          </ProtectedRoute>
        }
      />

      {/* Vitals & Triage */}
      <Route
        path="/vitals"
        element={
          <ProtectedRoute>
            <RoleAwareVitalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vitals/history"
        element={
          <ProtectedRoute>
            <RoleAwareVitalsPage />
          </ProtectedRoute>
        }
      />

      {/* Prescriptions */}
      <Route
        path="/prescriptions/patient/:patientId"
        element={
          <ProtectedRoute>
            <PrescriptionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions"
        element={
          <ProtectedRoute>
            <PrescriptionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions/new"
        element={
          <ProtectedRoute>
            <PrescriptionCreatePage />
          </ProtectedRoute>
        }
      />

      {/* Medical Records (EMR) */}
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <MedicalRecordListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/new"
        element={
          <ProtectedRoute>
            <MedicalRecordCreatePage />
          </ProtectedRoute>
        }
      />

      {/* Diagnostic Lab Reports */}
      <Route
        path="/lab-reports"
        element={
          <ProtectedRoute>
            <RoleAwareLabReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab-reports/upload"
        element={
          <ProtectedRoute>
            <RoleAwareLabReportUploadPage />
          </ProtectedRoute>
        }
      />

      {/* Billing & Invoicing */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/new"
        element={
          <ProtectedRoute>
            <BillingCreatePage />
          </ProtectedRoute>
        }
      />

      {/* Pharmacy & Stock */}
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute>
            <PharmacyListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy/add"
        element={
          <ProtectedRoute>
            <PharmacyAddPage />
          </ProtectedRoute>
        }
      />

      {/* Patient Portal */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <PatientPortalPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
