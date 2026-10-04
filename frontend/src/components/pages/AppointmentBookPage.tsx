import React, { useRef,  useState } from 'react';
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

const schema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  reason: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export const AppointmentBookPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/appointments', data);
      toast.success('Appointment booked successfully!');
      navigate('/appointments');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally { setIsSubmitting(false); }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="max-w-2xl mx-auto">
        <Link to="/appointments" className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Appointments
        </Link>
        <h1 className="text-2xl font-bold text-textPrimary mb-6">Book New Appointment</h1>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Patient ID" type="text" placeholder="patient-id-here" required error={errors.patientId?.message} {...register('patientId')} />
              <FormField label="Doctor ID" type="text" placeholder="doctor-id-here" required error={errors.doctorId?.message} {...register('doctorId')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Appointment Date" type="date" required error={errors.date?.message} {...register('date')} />
              <FormField label="Appointment Time" type="time" required error={errors.time?.message} {...register('time')} />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-textPrimary mb-1.5">Reason for Visit <span className="text-textSecondary">(optional)</span></label>
              <textarea rows={3} placeholder="Brief reason for the appointment..." className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" {...register('reason')} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => navigate('/appointments')}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>Book Appointment</Button>
            </div>
          </form>
        </Card>
      </div>
          </div>
    </DashboardLayout>
  );
};
