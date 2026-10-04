import React, { useRef,  useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Medicine { name: string; dosage: string; duration: string; instructions: string; }

export const PrescriptionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: '', dosage: '', duration: '', instructions: '' }]);

  const addMedicine = () => setMedicines([...medicines, { name: '', dosage: '', duration: '', instructions: '' }]);
  const removeMedicine = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (i: number, field: keyof Medicine, val: string) => {
    const updated = [...medicines];
    updated[i] = { ...updated[i], [field]: val };
    setMedicines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !diagnosis) { toast.error('Please fill all required fields'); return; }
    if (medicines.some((m) => !m.name)) { toast.error('Each medicine must have a name'); return; }
    setIsSubmitting(true);
    try {
      await api.post('/prescriptions', { patientId, doctorId, diagnosis, medicines });
      toast.success('Prescription created!');
      navigate('/prescriptions');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create prescription');
    } finally { setIsSubmitting(false); }
  };

  const fieldClass = 'w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors';

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="max-w-3xl mx-auto">
        <Link to="/prescriptions" className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Prescriptions
        </Link>
        <h1 className="text-2xl font-bold text-textPrimary mb-6">Create New Prescription</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card title="Patient & Doctor">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">Patient ID <span className="text-danger">*</span></label>
                  <input className={fieldClass} value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="patient-id" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1.5">Doctor ID <span className="text-danger">*</span></label>
                  <input className={fieldClass} value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="doctor-id" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1.5">Diagnosis <span className="text-danger">*</span></label>
                <textarea rows={2} className={fieldClass} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Primary diagnosis..." required />
              </div>
            </div>
          </Card>

          <Card title="Medicines" action={
            <Button type="button" variant="secondary" onClick={addMedicine} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />Add Medicine
            </Button>
          }>
            <div className="space-y-4">
              {medicines.map((m, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-textSecondary uppercase">Medicine #{i + 1}</p>
                    {medicines.length > 1 && (
                      <button type="button" onClick={() => removeMedicine(i)} className="text-danger hover:opacity-70 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="block text-xs font-medium text-textPrimary mb-1">Name *</label><input className={fieldClass} value={m.name} onChange={(e) => updateMedicine(i, 'name', e.target.value)} placeholder="Amoxicillin" required /></div>
                    <div><label className="block text-xs font-medium text-textPrimary mb-1">Dosage</label><input className={fieldClass} value={m.dosage} onChange={(e) => updateMedicine(i, 'dosage', e.target.value)} placeholder="500mg" /></div>
                    <div><label className="block text-xs font-medium text-textPrimary mb-1">Duration</label><input className={fieldClass} value={m.duration} onChange={(e) => updateMedicine(i, 'duration', e.target.value)} placeholder="7 days" /></div>
                    <div><label className="block text-xs font-medium text-textPrimary mb-1">Instructions</label><input className={fieldClass} value={m.instructions} onChange={(e) => updateMedicine(i, 'instructions', e.target.value)} placeholder="After meals" /></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/prescriptions')}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Save Prescription</Button>
          </div>
        </form>
      </div>
          </div>
    </DashboardLayout>
  );
};
