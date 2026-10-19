import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Receipt, CheckCircle, Calendar } from 'lucide-react';

import api from '../../shared/services/api';
import { parseAuthorizedPatients } from '../../shared/services/patients';
import { useAuthStore } from '../../store/authStore';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface InvoiceItem {
  description: string;
  amount: number;
}

interface Invoice {
  invoiceId: string;
  patientId: string;
  appointmentId: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

interface Patient {
  patientId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export const BillingListPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isPatient = user?.role.toLowerCase() === 'patient';
  const canManageInvoices = ['admin', 'doctor', 'nurse'].includes(user?.role.toLowerCase() || '');
  const canPayInvoices = user?.role.toLowerCase() === 'admin' || isPatient;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPatients = async () => {
      if (isPatient) {
        try {
          const profileResponse = await api.get('/patients/me', { skipToast: true }) as {
            data?: { patientId?: string };
          };
          if (!profileResponse.data?.patientId) {
            throw new Error('No patient profile is linked to your account.');
          }
          if (isMounted) setSelectedPatientId(profileResponse.data.patientId);
        } catch (err) {
          if (isMounted) setLoadError(err instanceof Error ? err.message : 'Failed to load your billing profile.');
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      try {
        const list = parseAuthorizedPatients(await api.get('/patients', { skipToast: true }));
        if (isMounted) {
          setPatients(list);
          setSelectedPatientId(list[0]?.patientId || '');
        }
      } catch (err) {
        if (isMounted) setLoadError(err instanceof Error ? err.message : 'Failed to load authorized patients.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchPatients();
    return () => {
      isMounted = false;
    };
  }, [isPatient]);

  // Fetch invoices whenever selected patient changes
  useEffect(() => {
    if (!selectedPatientId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await api.get(`/billing/patient/${encodeURIComponent(selectedPatientId)}`, { skipToast: true }) as Invoice[];
        if (!Array.isArray(response)) throw new Error('The billing service returned an invalid invoice list.');
        if (isMounted) setInvoices(response);
      } catch (err: unknown) {
        if (isMounted) {
          setInvoices([]);
          setLoadError(err instanceof Error ? err.message : 'Failed to fetch patient invoices.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInvoices();

    return () => {
      isMounted = false;
    };
  }, [selectedPatientId]);

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      setPayingId(invoiceId);
      await api.put(`/billing/${invoiceId}/pay`);
      toast.success('Payment status updated.');
      setInvoices((prev) =>
        prev.map((inv) => inv.invoiceId === invoiceId ? { ...inv, status: 'paid' } : inv)
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update payment status');
    } finally {
      setPayingId(null);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading, invoices]);

  // Safe invoice content renderer satisfying loading and empty checks
  const renderInvoiceContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 text-primary">
          <Spinner size="lg" />
          <span className="ml-3 text-sm text-textSecondary font-medium">Loading...</span>
        </div>
      );
    }

    if (loadError) {
      return (
        <div role="alert" className="rounded-md border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {loadError}
        </div>
      );
    }

    if (invoices.length === 0) {
      return (
        <Card>
          <p className="text-center text-textSecondary text-sm py-6">
            No invoices found
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {invoices.map((inv) => {
          const isPaid = inv.status === 'paid';
          const items = Array.isArray(inv.items) ? inv.items : [];
          const total = Number(inv.totalAmount || 0);

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
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                  <Badge variant={isPaid ? 'success' : 'warning'}>
                    {isPaid ? 'PAID' : 'PENDING'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs text-textSecondary py-1 border-b border-dashed border-border"
                  >
                    <span>{item?.description || 'Item'}</span>
                    <span className="font-mono font-medium text-textPrimary">
                      ${Number(item?.amount || 0).toFixed(2)}
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
                    ${total.toFixed(2)}
                  </p>
                </div>

                {!isPaid && canPayInvoices && (
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
        })}
      </div>
    );
  };

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

          {canManageInvoices && (
            <Link
              to="/billing/new"
              className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-surface px-4 py-2 rounded-md transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Link>
          )}
        </div>

        {!isPatient && (
          <div className="mb-6 max-w-sm">
            <label className="block text-xs font-semibold uppercase text-textSecondary mb-1.5">
              Select Patient
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={patients.length === 0}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary disabled:opacity-50"
            >
              {patients.length === 0 ? (
                <option value="">No patients available</option>
              ) : (
                patients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {(p.fullName || `${p.firstName || ''} ${p.lastName || ''}`).trim() || 'Unnamed Patient'}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {renderInvoiceContent()}
      </div>
    </DashboardLayout>
  );
};
