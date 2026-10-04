import React, { useRef,  useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Receipt } from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Label } from '../atoms/Label';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface BillingItem {
  description: string;
  amount: number;
}

export const BillingCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [patientId, setPatientId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [items, setItems] = useState<BillingItem[]>([
    { description: 'General Consultation', amount: 50 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingData(true);
        const res: any = await api.get('/patients');
        const list = Array.isArray(res) ? res : res.data || [];
        setPatients(list);
        if (list.length > 0) {
          setPatientId(list[0].patientId);
        }
      } catch (err) {
        toast.error('Failed to load patients list');
      } finally {
        setLoadingData(false);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!patientId) return;

    const fetchAppointments = async () => {
      try {
        const res: any = await api.get(`/appointments/patient/${patientId}`);
        const list = Array.isArray(res) ? res : res.data || [];
        setAppointments(list);
        if (list.length > 0) {
          setAppointmentId(list[0].appointmentId);
        } else {
          setAppointmentId('');
        }
      } catch (err) {
        console.error('Failed to load appointments for patient', err);
      }
    };
    fetchAppointments();
  }, [patientId]);

  const handleAddItem = () => {
    setItems([...items, { description: '', amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Invoice must have at least one billable item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof BillingItem, value: any) => {
    const updated = [...items];
    if (field === 'amount') {
      updated[index].amount = Number(value) || 0;
    } else {
      updated[index].description = value;
    }
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error('Please select a patient');
      return;
    }

    const invalidItem = items.find((item) => !item.description.trim() || item.amount <= 0);
    if (invalidItem) {
      toast.error('Please specify valid descriptions and amounts for all items');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/billing', {
        patientId,
        appointmentId: appointmentId || `APPT-${Date.now()}`,
        items,
      });

      toast.success('Invoice generated successfully!');
      navigate('/billing');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invoice');
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
          to="/billing"
          className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Invoices
        </Link>

        <h1 className="text-2xl font-bold text-textPrimary mb-6">
          Generate New Patient Invoice
        </h1>

        {loadingData ? (
          <div className="flex items-center justify-center py-16 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading patients...</span>
          </div>
        ) : (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="billingPatient" required>
                  Select Patient
                </Label>
                <select
                  id="billingPatient"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary"
                  required
                >
                  {patients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {(p.fullName || `${p.firstName || ''} ${p.lastName || ''}`).trim() || 'Unnamed Patient'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="billingAppt">Related Appointment (Optional)</Label>
                <select
                  id="billingAppt"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary"
                >
                  <option value="">-- No specific appointment --</option>
                  {appointments.map((a) => (
                    <option key={a.appointmentId} value={a.appointmentId}>
                      {new Date(a.appointmentDate).toLocaleDateString()} - ID: {a.appointmentId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label required>Billing Items & Services</Label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-md border border-textPrimary/10 bg-background p-3"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Service description (e.g. Blood Test, X-Ray)"
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(index, 'description', e.target.value)
                          }
                          className="w-full px-3 py-1.5 text-sm bg-surface border border-border rounded-md text-textPrimary focus:outline-none focus:border-primary"
                          required
                        />
                      </div>

                      <div className="w-32">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-textSecondary text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount || ''}
                            onChange={(e) =>
                              handleItemChange(index, 'amount', e.target.value)
                            }
                            className="w-full pl-6 pr-3 py-1.5 text-sm bg-surface border border-border rounded-md text-textPrimary focus:outline-none focus:border-primary"
                            required
                          />
                        </div>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-textSecondary hover:text-danger p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <span className="text-sm font-semibold text-textPrimary">
                  Total Billable Amount:
                </span>
                <span className="text-xl font-bold text-primary font-mono">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/billing')}
                >
                  Cancel
                </Button>

                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  <Receipt className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
          </div>
    </DashboardLayout>
  );
};
