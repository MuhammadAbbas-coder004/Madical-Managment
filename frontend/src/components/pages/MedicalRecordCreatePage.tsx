import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { fetchAuthorizedPatients } from '../../shared/services/patients';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { PatientSelect } from '../molecules/PatientSelect';
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

interface MedicalRecordForm {
  patientId: string;
}

export const MedicalRecordCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDoctor = useAuthStore((state) => state.user?.role.toLowerCase() === 'doctor');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, setValue } = useForm<MedicalRecordForm>({ defaultValues: { patientId: '' } });
  const patientId = useWatch({ control, name: 'patientId' }) || '';
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [allergies, setAllergies] = useState('');

  useEffect(() => {
    let active = true;
    const fetchDirectory = async () => {
      setLoadingDirectory(true);
      setDirectoryError(null);
      const [patientsResult, doctorsResult] = await Promise.allSettled([
        fetchAuthorizedPatients(),
        isDoctor
          ? Promise.resolve(null)
          : api.get('/doctors') as Promise<Doctor[] | { data?: Doctor | Doctor[] }>,
      ]);

      if (!active) return;

      if (patientsResult.status === 'fulfilled') {
        const patientList = patientsResult.value;
        setPatients(patientList);
        const requestedPatientId = searchParams.get('patientId') || '';
        const selectedPatient = patientList.find((patient) => patient.patientId === requestedPatientId);
        setValue('patientId', selectedPatient?.patientId || patientList[0]?.patientId || '');
      } else {
        const message = patientsResult.reason instanceof Error
          ? patientsResult.reason.message
          : 'Failed to load authorized patients.';
        setDirectoryError(message);
      }

      if (doctorsResult.status === 'fulfilled' && !isDoctor && doctorsResult.value) {
        const response = doctorsResult.value;
        let doctorList: Doctor[] = [];
        if (Array.isArray(response)) {
          doctorList = response;
        } else if (Array.isArray(response.data)) {
          doctorList = response.data;
        }
        setDoctors(doctorList);
        setDoctorId(doctorList[0]?.doctorId || '');
      } else if (doctorsResult.status === 'rejected') {
        const message = doctorsResult.reason instanceof Error
          ? doctorsResult.reason.message
          : 'Failed to load doctor information.';
        setDirectoryError((current) => current ? `${current} ${message}` : message);
      }
      setLoadingDirectory(false);
    };

    void fetchDirectory();
    return () => {
      active = false;
    };
  }, [isDoctor, searchParams, setValue]);

  const fieldClass =
    'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || (!isDoctor && !doctorId) || !diagnosis.trim()) {
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
        ...(!isDoctor ? { doctorId } : {}),
        diagnosis,
        notes,
        allergies: allergiesArray,
      });
      toast.success('Medical record created!');
      navigate(`/medical-records?patientId=${encodeURIComponent(patientId)}`);
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
              {directoryError && (
                <p role="alert" className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                  {directoryError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <PatientSelect
                    control={control}
                    name="patientId"
                    patients={patients}
                    patientsLoading={loadingDirectory}
                    patientsError={directoryError}
                  />
                </div>
                {!isDoctor && <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">
                    Select Doctor <span className="text-danger">*</span>
                  </label>
                  <select
                    className={fieldClass}
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    disabled={loadingDirectory || doctors.length === 0 || isDoctor}
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
                </div>}
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
