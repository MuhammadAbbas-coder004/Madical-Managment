import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Patient {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

interface Doctor {
  doctorId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  specialization?: string;
}

export const MedicalRecordCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [allergies, setAllergies] = useState('');

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        setLoadingDirectory(true);
        const [patientsRes, doctorsRes]: [any, any] = await Promise.all([
          api.get('/patients'),
          api.get('/doctors'),
        ]);

        const patientList: Patient[] = Array.isArray(patientsRes)
          ? patientsRes
          : patientsRes?.data || [];
        const doctorList: Doctor[] = Array.isArray(doctorsRes)
          ? doctorsRes
          : doctorsRes?.data || [];

        setPatients(patientList);
        setDoctors(doctorList);

        if (patientList.length > 0) {
          setPatientId(patientList[0].patientId);
        }
        if (doctorList.length > 0) {
          setDoctorId(doctorList[0].doctorId);
        }
      } catch (err) {
        toast.error('Failed to load clinic directory');
      } finally {
        setLoadingDirectory(false);
      }
    };

    fetchDirectory();
  }, []);

  const fieldClass =
    'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !diagnosis.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const allergiesArray = allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      await api.post('/medical-records', {
        patientId,
        doctorId,
        diagnosis,
        notes,
        allergies: allergiesArray,
      });
      toast.success('Medical record created!');
      navigate('/medical-records');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create medical record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="max-w-2xl mx-auto">
          <Link
            to="/medical-records"
            className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Medical Records
          </Link>
          <h1 className="text-2xl font-bold text-textPrimary mb-6">Create Medical Record</h1>
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">
                    Select Patient <span className="text-danger">*</span>
                  </label>
                  <select
                    className={fieldClass}
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    disabled={loadingDirectory || patients.length === 0}
                    required
                  >
                    {loadingDirectory ? (
                      <option value="">Loading patients...</option>
                    ) : patients.length === 0 ? (
                      <option value="">No patients available</option>
                    ) : (
                      patients.map((p) => {
                        const displayName =
                          p.fullName ||
                          `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
                          'Unnamed Patient';
                        return (
                          <option key={p.patientId} value={p.patientId}>
                            {displayName}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">
                    Select Doctor <span className="text-danger">*</span>
                  </label>
                  <select
                    className={fieldClass}
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    disabled={loadingDirectory || doctors.length === 0}
                    required
                  >
                    {loadingDirectory ? (
                      <option value="">Loading doctors...</option>
                    ) : doctors.length === 0 ? (
                      <option value="">No doctors available</option>
                    ) : (
                      doctors.map((d) => {
                        const docName =
                          d.fullName ||
                          `Dr. ${d.firstName || ''} ${d.lastName || ''}`.trim() ||
                          'Doctor';
                        const spec = d.specialization ? ` (${d.specialization})` : '';
                        return (
                          <option key={d.doctorId} value={d.doctorId}>
                            {docName}
                            {spec}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Diagnosis <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={2}
                  className={fieldClass}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Primary diagnosis..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Clinical Notes
                </label>
                <textarea
                  rows={3}
                  className={fieldClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes, treatment plan..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Allergies <span className="text-textSecondary text-xs">(comma-separated)</span>
                </label>
                <input
                  className={fieldClass}
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Aspirin, Latex"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/medical-records')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Save Record
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};
