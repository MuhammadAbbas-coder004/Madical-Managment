import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { format, isValid } from 'date-fns';
import { FileText, PlusCircle } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { PatientSelect, type PatientOption } from '../molecules/PatientSelect';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  _id?: string;
  prescriptionId?: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medicines: Medicine[];
  createdAt?: string;
}

interface Doctor {
  doctorId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

interface PrescriptionFilter {
  patientId: string;
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

const formatPrescriptionDate = (value?: string): string => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return isValid(date) ? format(date, 'PPP') : 'Date unavailable';
};

export const PrescriptionListPage: React.FC = () => {
  const { patientId: routePatientId } = useParams<{ patientId: string }>();
  return <PrescriptionListContent key={routePatientId || 'all'} routePatientId={routePatientId} />;
};

const PrescriptionListContent: React.FC<{ routePatientId?: string }> = ({ routePatientId }) => {
  const { control } = useForm<PrescriptionFilter>({
    defaultValues: { patientId: routePatientId || '' },
  });
  const selectedPatientId = useWatch({ control, name: 'patientId' }) || '';
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(Boolean(routePatientId));
  const [error, setError] = useState<string | null>(null);

  const handlePatientSelected = useCallback((patient: PatientOption | null) => {
    setSelectedPatient(patient);
    setLoading(Boolean(patient));
    setError(null);
    if (!patient) setPrescriptions([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchDoctors = async () => {
      try {
        const response = await api.get('/doctors');
        const doctors = getList<Doctor>(response);
        if (!cancelled) {
          const names = new Map<string, string>();
          doctors.forEach((doctor) => names.set(doctor.doctorId, getDoctorName(doctor)));
          setDoctorNames(names);
        }
      } catch {
        if (!cancelled) setDoctorNames(new Map());
      }
    };
    void fetchDoctors();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    let cancelled = false;
    const fetchPrescriptions = async () => {
      try {
        const response = await api.get(
          `/prescriptions/patient/${encodeURIComponent(selectedPatientId)}`
        );
        if (!cancelled) setPrescriptions(getList<Prescription>(response));
      } catch (err: unknown) {
        if (!cancelled) {
          setPrescriptions([]);
          setError(err instanceof Error ? err.message : 'Failed to load prescriptions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchPrescriptions();
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
            <h1 className="text-2xl font-bold text-textPrimary">
              {selectedPatient ? `${getPatientName(selectedPatient)}'s Prescriptions` : 'Prescriptions'}
            </h1>
            <p className="mt-1 text-sm text-textPrimary/70">Choose a patient to view their prescriptions.</p>
          </div>
          <Link
            to={`/prescriptions/new${selectedPatientId ? `?patientId=${encodeURIComponent(selectedPatientId)}` : ''}`}
            className="inline-flex items-center justify-center rounded-md bg-prescriptionPrimary px-4 py-2 text-sm font-medium text-surface shadow-sm hover:bg-prescriptionPrimaryDark"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Prescription
          </Link>
        </div>

        <div className="mb-6 max-w-lg">
          <PatientSelect
            control={control}
            name="patientId"
            onPatientSelected={handlePatientSelected}
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-prescriptionPrimary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textPrimary/70">Loading prescriptions...</span>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-md border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && !selectedPatientId && (
          <Card className="rounded-md border-textPrimary/10 bg-surface shadow-sm">
            <p className="py-4 text-center text-sm text-textPrimary/70">Choose a patient to view prescriptions.</p>
          </Card>
        )}

        {!loading && !error && selectedPatientId && prescriptions.length === 0 && (
          <Card className="rounded-md border-textPrimary/10 bg-surface shadow-sm">
            <p className="py-4 text-center text-sm text-textPrimary/70">
              No prescriptions for this patient yet.
            </p>
          </Card>
        )}

        {!loading && !error && prescriptions.length > 0 && (
          <div className="space-y-4">
            {prescriptions.map((prescription, index) => (
              <Card
                key={prescription.prescriptionId || prescription._id || index}
                className="rounded-md border-textPrimary/10 bg-surface shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-md bg-prescriptionPrimary/10 p-2 text-prescriptionPrimary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-textPrimary">
                        Diagnosis: {prescription.diagnosis}
                      </h2>
                      <time className="text-xs text-textPrimary/70">
                        {formatPrescriptionDate(prescription.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-textPrimary/70">
                      Doctor: {doctorNames.get(prescription.doctorId) || 'Doctor profile unavailable'}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {prescription.medicines.map((medicine, medicineIndex) => (
                        <li
                          key={`${prescription.prescriptionId || prescription._id || index}-${medicineIndex}`}
                          className="rounded-md border border-textPrimary/10 bg-background px-3 py-2 text-xs text-textPrimary"
                        >
                          <p className="font-semibold">{medicine.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-textPrimary/70">
                            {medicine.dosage && <span>Dosage: {medicine.dosage}</span>}
                            {medicine.duration && <span>Duration: {medicine.duration}</span>}
                            {medicine.instructions && <span>Instructions: {medicine.instructions}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
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
