import React, { useRef, useState, useEffect } from 'react';
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Load patients list on mount
  useEffect(() => {
    let isMounted = true;

    const fetchPatients = async () => {
      try {
        const res: any = await api.get('/patients');
        const list = Array.isArray(res) ? res : res?.data || [];
        if (isMounted) {
          setPatients(list);
          if (list.length > 0) {
            setSelectedPatientId(list[0].patientId);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          toast.error('Failed to load patients');
          setLoading(false);
        }
      }
    };

    fetchPatients();

    return () => {
      isMounted = false;
    };
  }, []);

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
        const res: any = await api.get(`/billing/patient/${selectedPatientId}`);

        // Safely extract list from various response formats (array, { data: [...] }, or undefined/null)
        const rawList = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : [];

        // Defensively normalize fields so differences in backend representation never crash the UI
        const normalized: Invoice[] = rawList.map((inv: any) => ({
          invoiceId: inv?.invoiceId || inv?._invoiceId || 'N/A',
          patientId: inv?.patientId || inv?._patientId || selectedPatientId,
          appointmentId: inv?.appointmentId || inv?._appointmentId || 'N/A',
          items: Array.isArray(inv?.items)
            ? inv.items
            : Array.isArray(inv?._items)
            ? inv._items
            : [],
          totalAmount: Number(inv?.totalAmount ?? inv?._totalAmount ?? 0),
          status: (inv?.status || inv?._status || 'pending').toLowerCase() === 'paid' ? 'paid' : 'pending',
          createdAt: inv?.createdAt || inv?._createdAt || new Date().toISOString(),
        }));

        if (isMounted) {
          setInvoices(normalized);
        }
      } catch (err: any) {
        if (isMounted) {
          // Safely set invoices to empty array on error so UI shows "No invoices found" instead of crashing
          setInvoices([]);
          toast.error(err?.message || 'Failed to fetch patient invoices');
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
      toast.success('Invoice marked as paid!');

      setInvoices((prev) =>
        (prev || []).map((inv) =>
          inv.invoiceId === invoiceId ? { ...inv, status: 'paid' } : inv
        )
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

    if (!invoices || invoices.length === 0) {
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

        {renderInvoiceContent()}
      </div>
    </DashboardLayout>
  );
};
