import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { PatientSelect, type PatientOption } from '../molecules/PatientSelect';
import { Button } from '../atoms/Button';
import { Label } from '../atoms/Label';
import { Input } from '../atoms/Input';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface Doctor {
  doctorId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  specialization?: string;
}

interface PrescriptionForm {
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medicines: Medicine[];
}

const getList = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
    return response.data as T[];
  }
  return [];
};

const getPatientName = (patient: PatientOption): string =>
  patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unnamed Patient';

const getDoctorName = (doctor: Doctor): string => {
  const name = doctor.fullName || [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || 'Doctor';
  return `Dr. ${name.replace(/^Dr\.\s*/i, '')}`;
};

const getAge = (dateOfBirth?: string): string => {
  if (!dateOfBirth || Number.isNaN(new Date(dateOfBirth).getTime())) return 'Not provided';
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) age -= 1;
  return `${age}`;
};

export const PrescriptionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isDoctor = user?.role?.toLowerCase() === 'doctor';
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [matchedDoctor, setMatchedDoctor] = useState<Doctor | null>(null);
  const [doctorLookupComplete, setDoctorLookupComplete] = useState(!isDoctor);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PrescriptionForm>({
    defaultValues: {
      patientId: searchParams.get('patientId') || '',
      doctorId: '',
      diagnosis: '',
      medicines: [{ name: '', dosage: '', duration: '', instructions: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });

  const handlePatientSelected = useCallback((patient: PatientOption | null) => {
    setSelectedPatient(patient);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchDoctors = async () => {
      try {
        const response = await api.get('/doctors');
        const doctorList = getList<Doctor>(response);
        if (cancelled) return;
        setDoctors(doctorList);

        if (isDoctor) {
          const ownDoctor = doctorList.find(
            (doctor) => doctor.email?.trim().toLowerCase() === user?.email.trim().toLowerCase()
          );
          if (ownDoctor) {
            setMatchedDoctor(ownDoctor);
            setValue('doctorId', ownDoctor.doctorId);
          }
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Could not load doctor profiles.');
        }
      } finally {
        if (!cancelled) setDoctorLookupComplete(true);
      }
    };
    void fetchDoctors();
    return () => {
      cancelled = true;
    };
  }, [isDoctor, setValue, user?.email]);

  const submitPrescription = async (form: PrescriptionForm) => {
    if (!selectedPatient) {
      toast.error('Please choose a patient.');
      return;
    }
    if (form.medicines.some((medicine) => !medicine.name.trim())) {
      toast.error('Enter a name for each medicine.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/prescriptions', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        diagnosis: form.diagnosis,
        medicines: form.medicines,
      });
      toast.success(`Prescription saved for ${getPatientName(selectedPatient)}`);
      navigate(`/prescriptions/patient/${encodeURIComponent(form.patientId)}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    'w-full rounded-md border border-textPrimary/10 bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textPrimary/50 focus:border-prescriptionPrimary focus:outline-none focus:ring-2 focus:ring-prescriptionPrimary/20';
  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mx-auto max-w-3xl">
          <Link
            to="/prescriptions"
            className="mb-4 inline-flex items-center text-xs font-semibold text-textPrimary/70 hover:text-textPrimary"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Prescriptions
          </Link>
          <h1 className="mb-6 text-2xl font-bold text-textPrimary">Create New Prescription</h1>

          <form onSubmit={handleSubmit(submitPrescription)} className="space-y-5">
            <Card title="Patient & Doctor" className="rounded-md border-textPrimary/10 bg-surface shadow-sm">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PatientSelect
                    control={control}
                    name="patientId"
                    onPatientSelected={handlePatientSelected}
                  />

                  {selectedPatient && (
                    <div className="rounded-md border border-textPrimary/10 bg-background p-3 text-sm">
                      <p className="font-medium text-textPrimary">{getPatientName(selectedPatient)}</p>
                      <p className="mt-1 text-xs text-textPrimary/70">
                        Age: {getAge(selectedPatient.dateOfBirth)} · Phone: {selectedPatient.phone || 'Not provided'}
                      </p>
                    </div>
                  )}
                </div>

                {!doctorLookupComplete && (
                  <p className="text-sm text-textPrimary/70">Finding your doctor profile...</p>
                )}
                {doctorLookupComplete && isDoctor && matchedDoctor && (
                  <div className="rounded-md border border-textPrimary/10 bg-background px-3 py-2 text-sm text-textPrimary">
                    Prescribing as {getDoctorName(matchedDoctor)}
                  </div>
                )}
                {doctorLookupComplete && (!isDoctor || !matchedDoctor) && (
                  <div>
                    <Label htmlFor="doctorId" required>Select Doctor</Label>
                    <select
                      id="doctorId"
                      {...register('doctorId', { required: 'Please choose a doctor.' })}
                      className={fieldClass}
                    >
                      <option value="">Choose a doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.doctorId} value={doctor.doctorId}>
                          {getDoctorName(doctor)}
                          {doctor.specialization ? ` (${doctor.specialization})` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.doctorId && (
                      <p role="alert" className="mt-1 text-xs text-danger">{errors.doctorId.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="diagnosis" required>Diagnosis</Label>
                  <textarea
                    id="diagnosis"
                    rows={3}
                    {...register('diagnosis', { required: 'Diagnosis is required.' })}
                    className={fieldClass}
                    placeholder="Primary diagnosis"
                  />
                  {errors.diagnosis && (
                    <p role="alert" className="mt-1 text-xs text-danger">{errors.diagnosis.message}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title="Medicines"
              className="rounded-md border-textPrimary/10 shadow-sm"
              action={
                <Button
                  type="button"
                  variant="primary"
                  className="!bg-prescriptionPrimary hover:!bg-prescriptionPrimaryDark"
                  onClick={() => append({ name: '', dosage: '', duration: '', instructions: '' })}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Medicine
                </Button>
              }
            >
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-md border border-textPrimary/10 bg-background p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-textPrimary">Medicine {index + 1}</p>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label={`Remove medicine ${index + 1}`}
                          className="rounded-md p-1 text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`medicine-name-${index}`} required>Name</Label>
                        <Input
                          id={`medicine-name-${index}`}
                          {...register(`medicines.${index}.name`, { required: 'Medicine name is required.' })}
                          className="rounded-md !border-textPrimary/10 bg-surface text-textPrimary focus:!border-prescriptionPrimary focus:!ring-prescriptionPrimary/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`medicine-dosage-${index}`}>Dosage</Label>
                        <Input
                          id={`medicine-dosage-${index}`}
                          {...register(`medicines.${index}.dosage`)}
                          className="rounded-md !border-textPrimary/10 bg-surface text-textPrimary focus:!border-prescriptionPrimary focus:!ring-prescriptionPrimary/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`medicine-duration-${index}`}>Duration</Label>
                        <Input
                          id={`medicine-duration-${index}`}
                          {...register(`medicines.${index}.duration`)}
                          className="rounded-md !border-textPrimary/10 bg-surface text-textPrimary focus:!border-prescriptionPrimary focus:!ring-prescriptionPrimary/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`medicine-instructions-${index}`}>Instructions</Label>
                        <Input
                          id={`medicine-instructions-${index}`}
                          {...register(`medicines.${index}.instructions`)}
                          className="rounded-md !border-textPrimary/10 bg-surface text-textPrimary focus:!border-prescriptionPrimary focus:!ring-prescriptionPrimary/20"
                        />
                      </div>
                    </div>
                    {errors.medicines?.[index]?.name && (
                      <p role="alert" className="text-xs text-danger">
                        {errors.medicines[index]?.name?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Link
                to="/prescriptions"
                className="inline-flex items-center justify-center rounded-md border border-textPrimary/10 bg-surface px-4 py-2 text-sm font-medium text-textPrimary hover:bg-background"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                isLoading={isSubmitting || !doctorLookupComplete}
                className="!bg-prescriptionPrimary hover:!bg-prescriptionPrimaryDark"
              >
                Save Prescription
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};
