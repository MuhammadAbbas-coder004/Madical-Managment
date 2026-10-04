import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Receipt, CheckCircle, Calendar } from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Invoice {
  invoiceId: string;
  patientId: string;
  appointmentId: string;
  items: { description: string; amount: number }[];
  totalAmount: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

export const BillingListPage: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res: any = await api.get('/patients');
        const list = Array.isArray(res) ? res : res.data || [];
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0].patientId);
        }
      } catch (err) {
        toast.error('Failed to load patients');
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res: any = await api.get(`/billing/patient/${selectedPatientId}`);
        const data = Array.isArray(res) ? res : res.data || [];
        setInvoices(data);
      } catch (err: any) {
        toast.error('Failed to fetch patient invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [selectedPatientId]);

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      setPayingId(invoiceId);
      await api.put(`/billing/${invoiceId}/pay`);
      toast.success('Invoice marked as paid!');

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.invoiceId === invoiceId ? { ...inv, status: 'paid' } : inv
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setPayingId(null);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Invoices & Billing</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            Manage patient invoices, payment status, and clinical fee collections.
          </p>
        </div>

        <Link
          to="/billing/new"
          className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Link>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="block text-xs font-semibold uppercase text-textSecondary mb-1.5">
          Select Patient
        </label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary"
        >
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>
              {p.fullName || `${p.firstName} ${p.lastName}`} (ID: {p.patientId})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-primary">
          <Spinner size="lg" />
          <span className="ml-3 text-sm text-textSecondary">Loading invoices...</span>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <Card>
              <p className="text-center text-textSecondary text-sm py-6">
                No invoices found for this patient.
              </p>
            </Card>
          ) : (
            invoices.map((inv) => {
              const isPaid = inv.status === 'paid';

              return (
                <Card key={inv.invoiceId} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-primary" />
                      <div>
                        <span className="font-mono text-sm font-bold text-textPrimary">
                          {inv.invoiceId}
                        </span>
                        <p className="text-xs text-textSecondary">
                          Ref Appointment: {inv.appointmentId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-textSecondary flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                      <Badge variant={isPaid ? 'success' : 'warning'}>
                        {isPaid ? 'PAID' : 'PENDING'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {inv.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-textSecondary py-1 border-b border-dashed border-border"
                      >
                        <span>{item.description}</span>
                        <span className="font-mono font-medium text-textPrimary">
                          ${Number(item.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs text-textSecondary uppercase font-semibold">
                        Total Amount Due:
                      </span>
                      <p className="text-xl font-bold text-textPrimary font-mono">
                        ${inv.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    {!isPaid && (
                      <Button
                        variant="primary"
                        className="text-xs py-1.5 px-3"
                        isLoading={payingId === inv.invoiceId}
                        onClick={() => handleMarkAsPaid(inv.invoiceId)}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
          </div>
    </DashboardLayout>
  );
};
