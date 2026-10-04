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
  heartRate: z.coerce.number().min(1, 'Heart rate is required'),
  bloodPressureSystolic: z.coerce.number().min(1, 'Systolic BP is required'),
  bloodPressureDiastolic: z.coerce.number().min(1, 'Diastolic BP is required'),
  temperature: z.coerce.number().min(1, 'Temperature is required'),
  oxygenSaturation: z.coerce.number().min(1, 'O2 saturation is required'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export const VitalsRecordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        patientId: data.patientId,
        heartRate: data.heartRate,
        bloodPressure: { systolic: data.bloodPressureSystolic, diastolic: data.bloodPressureDiastolic },
        temperature: data.temperature,
        oxygenSaturation: data.oxygenSaturation,
        notes: data.notes,
      };
      await api.post('/vitals', payload);
      toast.success('Vitals recorded successfully!');
      navigate('/vitals');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record vitals');
    } finally { setIsSubmitting(false); }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="max-w-2xl mx-auto">
        <Link to="/vitals" className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Vitals History
        </Link>
        <h1 className="text-2xl font-bold text-textPrimary mb-6">Record Patient Vitals</h1>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Patient ID" type="text" placeholder="patient-id-here" required error={errors.patientId?.message} {...register('patientId')} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <FormField label="Heart Rate (bpm)" type="number" placeholder="72" required error={errors.heartRate?.message} {...register('heartRate')} />
              <FormField label="BP Systolic (mmHg)" type="number" placeholder="120" required error={errors.bloodPressureSystolic?.message} {...register('bloodPressureSystolic')} />
              <FormField label="BP Diastolic (mmHg)" type="number" placeholder="80" required error={errors.bloodPressureDiastolic?.message} {...register('bloodPressureDiastolic')} />
              <FormField label="Temperature (°C)" type="number" step="0.1" placeholder="36.6" required error={errors.temperature?.message} {...register('temperature')} />
              <FormField label="O2 Saturation (%)" type="number" placeholder="98" required error={errors.oxygenSaturation?.message} {...register('oxygenSaturation')} />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-textPrimary mb-1.5">Clinical Notes <span className="text-textSecondary">(optional)</span></label>
              <textarea rows={3} placeholder="Any additional observations..." className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors" {...register('notes')} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => navigate('/vitals')}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>Save Vitals</Button>
            </div>
          </form>
        </Card>
      </div>
          </div>
    </DashboardLayout>
  );
};
