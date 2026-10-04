import React, { useRef,  useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const MedicalRecordCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [allergies, setAllergies] = useState('');

  const fieldClass =
    'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !diagnosis) {
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
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Medical Records
        </Link>
        <h1 className="text-2xl font-bold text-textPrimary mb-6">Create Medical Record</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Patient ID <span className="text-danger">*</span>
                </label>
                <input className={fieldClass} value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="patient-id" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">
                  Doctor ID <span className="text-danger">*</span>
                </label>
                <input className={fieldClass} value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="doctor-id" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-1.5">
                Diagnosis <span className="text-danger">*</span>
              </label>
              <textarea rows={2} className={fieldClass} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Primary diagnosis..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-1.5">Clinical Notes</label>
              <textarea rows={3} className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes, treatment plan..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-1.5">
                Allergies <span className="text-textSecondary text-xs">(comma-separated)</span>
              </label>
              <input className={fieldClass} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Aspirin, Latex" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => navigate('/medical-records')}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>Save Record</Button>
            </div>
          </form>
        </Card>
      </div>
          </div>
    </DashboardLayout>
  );
};
