import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
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

const schema = z.object({
  patientId: z.string().min(1, 'Patient selection is required'),
  doctorId: z.string().min(1, 'Doctor selection is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  reason: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export const AppointmentBookPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
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
          setValue('patientId', patientList[0].patientId);
        }
        if (doctorList.length > 0) {
          setValue('doctorId', doctorList[0].doctorId);
        }
      } catch (err: unknown) {
        toast.error('Failed to load clinic directory');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const appointmentDate = new Date(`${data.date}T${data.time}`);
      if (Number.isNaN(appointmentDate.getTime())) {
        throw new Error('Please enter a valid appointment date and time');
      }
      await api.post('/appointments', {
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentDate: appointmentDate.toISOString(),
        notes: data.reason,
      });
      toast.success('Appointment booked successfully!');
      navigate('/appointments');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to book appointment');
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
            to="/appointments"
            className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Appointments
          </Link>
          <h1 className="text-2xl font-bold text-textPrimary mb-6">Book New Appointment</h1>
          <Card>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="apptPatient"
                    className="block text-sm font-medium text-textPrimary mb-1.5"
                  >
                    Select Patient <span className="text-danger">*</span>
                  </label>
                  <select
                    id="apptPatient"
                    disabled={loadingData || patients.length === 0}
                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
                    {...register('patientId')}
                  >
                    {loadingData ? (
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
                  {errors.patientId && (
                    <p className="text-xs text-danger mt-1">{errors.patientId.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="apptDoctor"
                    className="block text-sm font-medium text-textPrimary mb-1.5"
                  >
                    Select Doctor <span className="text-danger">*</span>
                  </label>
                  <select
                    id="apptDoctor"
                    disabled={loadingData || doctors.length === 0}
                    className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-50"
                    {...register('doctorId')}
                  >
                    {loadingData ? (
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
                  {errors.doctorId && (
                    <p className="text-xs text-danger mt-1">{errors.doctorId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Appointment Date"
                  type="date"
                  required
                  error={errors.date?.message}
                  {...register('date')}
                />
                <FormField
                  label="Appointment Time"
                  type="time"
                  required
                  error={errors.time?.message}
                  {...register('time')}
                />
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Reason for Visit <span className="text-textSecondary">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief reason for the appointment..."
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  {...register('reason')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/appointments')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Book Appointment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};
