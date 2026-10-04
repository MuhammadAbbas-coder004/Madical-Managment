import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ClipboardPlus } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Label } from '../atoms/Label';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface PatientOption {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export const LabReportUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testName, setTestName] = useState('');
  const [result, setResult] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient.');
      return;
    }

    setIsSaving(true);
    try {
      await api.post(`/lab-reports/patient/${encodeURIComponent(selectedPatientId)}`, {
        testName,
        result,
      });
      toast.success('Lab report created successfully.');
      navigate('/lab-reports');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create lab report.');
    } finally {
      setIsSaving(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mx-auto max-w-2xl">
          <Link
            to="/lab-reports"
            className="mb-4 inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Lab Reports
          </Link>

          <h1 className="mb-6 text-2xl font-bold text-textPrimary">Create Lab Report</h1>

          {loadingPatients ? (
            <div className="flex items-center justify-center py-16 text-primary">
              <Spinner size="lg" />
              <span className="ml-3 text-sm text-textSecondary">Loading patients...</span>
            </div>
          ) : (
            <Card>
              {patients.length === 0 ? (
                <p className="py-4 text-center text-sm text-textSecondary">No patients found.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="labPatient" required>Select Patient</Label>
                    <select
                      id="labPatient"
                      value={selectedPatientId}
                      onChange={(event) => setSelectedPatientId(event.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none"
                      required
                    >
                      {patients.map((patient) => (
                        <option key={patient.patientId} value={patient.patientId}>
                          {(patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`).trim()
                            || 'Unnamed Patient'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="testName" required>Test Name</Label>
                    <input
                      id="testName"
                      value={testName}
                      onChange={(event) => setTestName(event.target.value)}
                      placeholder="e.g., Blood Test, X-Ray"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="result" required>Result/Notes</Label>
                    <textarea
                      id="result"
                      value={result}
                      onChange={(event) => setResult(event.target.value)}
                      rows={6}
                      placeholder="Enter the test results and any relevant notes"
                      className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-border pt-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/lab-reports')}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isSaving}>
                      <ClipboardPlus className="mr-2 h-4 w-4" />
                      Save Report
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
