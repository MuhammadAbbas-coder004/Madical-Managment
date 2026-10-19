import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { format, isValid } from 'date-fns';
import { FileText, PlusCircle } from 'lucide-react';
import api from '../../shared/services/api';
import { parsePatientPortalList } from '../../shared/services/patientPortal';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import type { PatientOption } from '../molecules/PatientSelect';
import { SearchBar } from '../molecules/SearchBar';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Medicine {
  name: string;
  dosage: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface Prescription {
  _id?: string;
  prescriptionId?: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patient?: {
    patientId?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
  } | null;
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
  return parsePatientPortalList<T>(response, 'records');
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
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId') || undefined;
  return <PrescriptionListContent key={routePatientId || queryPatientId || 'all'} routePatientId={routePatientId || queryPatientId} />;
};

const PrescriptionListContent: React.FC<{ routePatientId?: string }> = ({ routePatientId }) => {
  const [searchParams] = useSearchParams();
  const { control, setValue } = useForm<PrescriptionFilter>({
    defaultValues: { patientId: routePatientId || searchParams.get('patientId') || '' },
  });
  const selectedPatientId = useWatch({ control, name: 'patientId' }) || '';
  const user = useAuthStore((state) => state.user);
  const isDoctor = user?.role.toLowerCase() === 'doctor';
  const isPatient = user?.role.toLowerCase() === 'patient';
  const canWritePrescription = !isDoctor || user?.doctorVerificationStatus === 'verified';
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());
  const [patientNames, setPatientNames] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(Boolean(routePatientId) || isDoctor || isPatient);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPatient) return;
    let cancelled = false;
    const loadOwnPatient = async () => {
      try {
        const response = await api.get('/patients/me', { skipToast: true }) as {
          data?: PatientOption;
        };
        const patient = response.data;
        if (!patient?.patientId) {
          throw new Error('No patient profile is linked to your account.');
        }
        if (!cancelled) {
          setValue('patientId', patient.patientId);
          setSelectedPatient(patient);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your patient profile.');
          setLoading(false);
        }
      }
    };
    void loadOwnPatient();
    return () => {
      cancelled = true;
    };
  }, [isPatient, setValue]);

  useEffect(() => {
    let cancelled = false;
    const fetchDoctors = async () => {
      if (isDoctor) return;
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
  }, [isDoctor]);

  useEffect(() => {
    if (!isDoctor) return;

    let cancelled = false;
    const fetchDoctorPrescriptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileResponse = await api.get('/doctors/me', { skipToast: true }) as {
          data?: Doctor & { doctorId: string };
        };
        const doctorId = profileResponse.data?.doctorId;
        if (!doctorId) throw new Error('No doctor profile is linked to your account.');

        const [prescriptionResponse, patientResponse] = await Promise.all([
          api.get(`/prescriptions/doctor/${encodeURIComponent(doctorId)}`, { skipToast: true }),
          api.get('/patients', { skipToast: true }),
        ]);
        if (cancelled) return;

        const ownDoctor = profileResponse.data;
        const doctorName = ownDoctor
          ? getDoctorName(ownDoctor)
          : 'Doctor';
        setDoctorNames(new Map([[doctorId, doctorName]]));
        const patients = parsePatientPortalList<PatientOption>(patientResponse, 'patients');
        setPatientNames(new Map(patients.map((patient) => [
          patient.patientId,
          getPatientName(patient),
        ])));
        const requestedPatientId = routePatientId || searchParams.get('patientId') || '';
        const requestedPatient = patients.find((patient) => patient.patientId === requestedPatientId) || null;
        setSelectedPatient(requestedPatient);
        if (requestedPatientId && !requestedPatient) setValue('patientId', '');
        const doctorPrescriptions = parsePatientPortalList<Prescription>(prescriptionResponse, 'prescriptions');
        setPrescriptions(doctorPrescriptions);
      } catch (err: unknown) {
        if (!cancelled) {
          setPrescriptions([]);
          const message = err instanceof Error ? err.message : 'Failed to load prescriptions.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchDoctorPrescriptions();
    return () => {
      cancelled = true;
    };
  }, [isDoctor, routePatientId, searchParams, setValue]);

  useEffect(() => {
    if (isDoctor || !selectedPatientId) return;

    let cancelled = false;
    const fetchPrescriptions = async () => {
      try {
        const response = await api.get(
          `/prescriptions/patient/${encodeURIComponent(selectedPatientId)}`,
          { skipToast: true }
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
  }, [isDoctor, selectedPatientId]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);
  const patientFilteredPrescriptions = isDoctor
    ? selectedPatientId
      ? prescriptions.filter((prescription) => prescription.patientId === selectedPatientId)
      : routePatientId
        ? prescriptions.filter((prescription) => prescription.patientId === routePatientId)
        : prescriptions
    : prescriptions;
  const normalizedSearch = search.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  const searchablePrescriptions = isDoctor && normalizedSearch && !selectedPatientId
    ? prescriptions
    : patientFilteredPrescriptions;
  const displayedPrescriptions = normalizedSearch
    ? searchablePrescriptions.filter((prescription) => {
      const patientName = prescription.patientName
        || prescription.patient?.fullName
        || [prescription.patient?.firstName, prescription.patient?.lastName].filter(Boolean).join(' ')
        || patientNames.get(prescription.patientId)
        || '';
      const patientEmail = prescription.patientEmail || prescription.patient?.email || '';
      const searchableValues = [
        patientName,
        patientEmail,
        prescription.patientId,
        prescription.diagnosis,
        ...prescription.medicines.map((medicine) => medicine.name),
      ];
      return searchableValues.some((value) =>
        value.trim().toLocaleLowerCase().replace(/\s+/g, ' ').includes(normalizedSearch)
      );
    })
    : patientFilteredPrescriptions;

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">
              {isDoctor
                ? selectedPatient
                  ? `${getPatientName(selectedPatient)}'s Prescriptions`
                  : 'My Prescriptions'
                : selectedPatient
                  ? `${getPatientName(selectedPatient)}'s Prescriptions`
                  : 'Prescriptions'}
            </h1>
            <p className="mt-1 text-sm text-textPrimary/70">
              {isDoctor
                ? selectedPatient
                  ? `Prescriptions issued for ${getPatientName(selectedPatient)}.`
                  : 'Prescriptions you have issued to your patients.'
                : 'Prescriptions recorded for your patient profile.'}
            </p>
          </div>
          {canWritePrescription && (
            <Link
              to={`/prescriptions/new${selectedPatientId ? `?patientId=${encodeURIComponent(selectedPatientId)}` : ''}`}
              className="inline-flex items-center justify-center rounded-md bg-prescriptionPrimary px-4 py-2 text-sm font-medium text-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-prescriptionPrimaryDark hover:shadow-md"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Prescription
            </Link>
          )}
        </div>

        <div className="mb-6 max-w-lg">
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by patient name or email"
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

        {!loading && !error && !isDoctor && !isPatient && !selectedPatientId && (
          <Card className="rounded-md border-textPrimary/10 bg-surface shadow-sm">
            <p className="py-4 text-center text-sm text-textPrimary/70">Choose a patient to view prescriptions.</p>
          </Card>
        )}

        {!loading && !error && (isDoctor || selectedPatientId) && displayedPrescriptions.length === 0 && (
          <Card className="rounded-md border-textPrimary/10 bg-surface shadow-sm">
            <p className="py-4 text-center text-sm text-textPrimary/70">
              {isDoctor
                ? normalizedSearch
                  ? 'No prescriptions found for this search'
                  : selectedPatientId
                  ? 'No prescriptions have been issued for this patient yet.'
                  : 'No prescriptions have been issued yet.'
                : normalizedSearch
                  ? 'No prescriptions found for this search'
                  : 'No prescriptions for this patient yet.'}
            </p>
          </Card>
        )}

        {!loading && !error && displayedPrescriptions.length > 0 && (
          <div className="space-y-4">
            {displayedPrescriptions.map((prescription, index) => (
              <Card
                key={prescription.prescriptionId || prescription._id || index}
                className={`rounded-md border-textPrimary/10 bg-surface shadow-sm ${isDoctor ? 'transition-shadow hover:shadow-md' : ''}`}
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
                    {isDoctor && (
                      <p className="mt-1 text-xs text-textPrimary/70">
                        Patient: {prescription.patientName || prescription.patient?.fullName || patientNames.get(prescription.patientId) || prescription.patientId}
                        {(prescription.patientEmail || prescription.patient?.email) && ` · ${prescription.patientEmail || prescription.patient?.email}`}
                      </p>
                    )}
                    <ul className="mt-3 space-y-2">
                      {prescription.medicines.map((medicine, medicineIndex) => (
                        <li
                          key={`${prescription.prescriptionId || prescription._id || index}-${medicineIndex}`}
                          className="rounded-md border border-textPrimary/10 bg-background px-3 py-2 text-xs text-textPrimary"
                        >
                          <p className="font-semibold">{medicine.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-textPrimary/70">
                            {medicine.dosage && <span>Dosage: {medicine.dosage}</span>}
                            {medicine.frequency && <span>Frequency: {medicine.frequency}</span>}
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
