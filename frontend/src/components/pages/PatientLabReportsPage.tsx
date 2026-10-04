import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import type { LabReport } from '../../shared/types';

export const PatientLabReportsPage: React.FC = () => {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  useEffect(() => {
    let cancelled = false;

    const fetchMyLabReports = async () => {
      try {
        const profileResponse = await api.get('/patients/me') as {
          data?: { patientId?: string };
        };
        const patientId = profileResponse.data?.patientId;
        if (!patientId) throw new Error('No patient profile is linked to your account.');

        const response = await api.get(
          `/lab-reports/patient/${encodeURIComponent(patientId)}`
        ) as { reports?: LabReport[] };
        if (!cancelled) {
          setReports(Array.isArray(response.reports) ? response.reports : []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your lab reports.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchMyLabReports();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadReport = (report: LabReport) => {
    const date = new Date(report.uploadedAt).toLocaleString();
    const contents = `Test Name: ${report.testName}\nDate: ${date}\n\nResult/Notes:\n${report.result}\n`;
    const file = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    const safeTestName = report.testName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    link.href = fileUrl;
    link.download = `lab-report-${safeTestName || 'report'}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 0);
  };

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">My Lab Reports</h1>
          <p className="mt-1 text-sm text-textSecondary">
            View and download test results recorded for you.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading your lab reports...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-textSecondary">No lab reports yet.</p>
          </Card>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report._id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-textPrimary">{report.testName}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-textSecondary">
                      {report.result}
                    </p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-textSecondary">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(report.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadReport(report)}
                    className="inline-flex shrink-0 items-center justify-center rounded-md border border-textPrimary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-background"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
