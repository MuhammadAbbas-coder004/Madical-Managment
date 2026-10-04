import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardPlus, Calendar } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import type { LabReport } from '../../shared/types';

interface PatientOption {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export const LabReportListPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('/patients') as
          | PatientOption[]
          | { data?: PatientOption[] };
        const list = Array.isArray(response) ? response : response.data || [];
        setPatients(list);
        if (list.length > 0) setSelectedPatientId(list[0].patientId);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to load patients.');
      } finally {
        setLoadingPatients(false);
      }
    };
    void fetchPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }

    let cancelled = false;
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/lab-reports/patient/${encodeURIComponent(selectedPatientId)}`
        ) as { reports?: LabReport[] };
        if (!cancelled) setReports(Array.isArray(response.reports) ? response.reports : []);
      } catch (error: unknown) {
        if (!cancelled) {
          setReports([]);
          toast.error(error instanceof Error ? error.message : 'Failed to fetch lab reports.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchReports();
    return () => {
      cancelled = true;
    };
  }, [selectedPatientId]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Lab Reports</h1>
            <p className="mt-0.5 text-sm text-textSecondary">Test results and clinical notes.</p>
          </div>
          <Link
            to="/lab-reports/upload"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface shadow-sm transition-colors hover:bg-primary-hover"
          >
            <ClipboardPlus className="mr-2 h-4 w-4" />
            Create Lab Report
          </Link>
        </div>

        <div className="mb-6 max-w-sm">
          <label htmlFor="reportPatient" className="mb-1.5 block text-xs font-semibold uppercase text-textSecondary">
            Select Patient
          </label>
          <select
            id="reportPatient"
            value={selectedPatientId}
            onChange={(event) => setSelectedPatientId(event.target.value)}
            disabled={loadingPatients || patients.length === 0}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none"
          >
            {patients.map((patient) => (
              <option key={patient.patientId} value={patient.patientId}>
                {(patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`).trim()
                  || 'Unnamed Patient'}
              </option>
            ))}
          </select>
        </div>

        {(loading || loadingPatients) && (
          <div className="flex items-center justify-center py-16 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading lab reports...</span>
          </div>
        )}

        {!loading && !loadingPatients && reports.length === 0 && (
          <Card>
            <p className="py-6 text-center text-sm text-textSecondary">
              No lab reports yet for this patient.
            </p>
          </Card>
        )}

        {!loading && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-textPrimary">{report.testName}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-textSecondary">{report.result}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-textSecondary">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(report.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
