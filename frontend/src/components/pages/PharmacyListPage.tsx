import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pill, Minus, Calendar } from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { SearchBar } from '../molecules/SearchBar';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Medicine {
  medicineId: string;
  _id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string;
}

export const PharmacyListPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dispenseAmounts, setDispenseAmounts] = useState<{ [id: string]: number }>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/pharmacy');
      const list = Array.isArray(res) ? res : res.data || [];
      setMedicines(list);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleDispenseAmountChange = (id: string, val: number) => {
    setDispenseAmounts((prev) => ({
      ...prev,
      [id]: Math.max(1, val),
    }));
  };

  const handleReduceStock = async (medicine: Medicine) => {
    const medId = medicine.medicineId || medicine._id;
    if (!medId) return;

    const amount = dispenseAmounts[medId] || 1;

    if (amount > medicine.quantity) {
      toast.error(`Cannot dispense more than available stock (${medicine.quantity})`);
      return;
    }

    try {
      setUpdatingId(medId);
      await api.put(`/pharmacy/${medId}/reduce-stock`, { amount });
      toast.success(`Dispensed ${amount} unit(s) of ${medicine.name}`);

      setMedicines((prev) =>
        prev.map((m) => {
          const currentId = m.medicineId || m._id;
          return currentId === medId
            ? { ...m, quantity: m.quantity - amount }
            : m;
        })
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispense stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Pharmacy & Medication Stock</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            Monitor dispensary stock levels, prices, expiry dates, and dispense medications.
          </p>
        </div>

        <Link
          to="/pharmacy/add"
          className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-surface px-4 py-2 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Link>
      </div>

      <div className="mb-6 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search medication name..."
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-primary">
          <Spinner size="lg" />
          <span className="ml-3 text-sm text-textSecondary">Loading pharmacy inventory...</span>
        </div>
      )}

      {!loading && (
        <Card className="!p-0 overflow-hidden">
          {filteredMedicines.length === 0 ? (
            <div className="p-8 text-center text-textSecondary text-sm">
              No medications found in pharmacy stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-textPrimary/10 text-xs uppercase font-semibold text-textSecondary">
                  <tr>
                    <th className="px-6 py-3">Medication Name</th>
                    <th className="px-6 py-3">In Stock</th>
                    <th className="px-6 py-3">Unit Price</th>
                    <th className="px-6 py-3">Expiry Date</th>
                    <th className="px-6 py-3 text-right">Dispense / Reduce Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-textPrimary">
                  {filteredMedicines.map((med) => {
                    const id = med.medicineId || med._id || '';
                    const isLowStock = med.quantity <= 10;
                    const isOutOfStock = med.quantity === 0;
                    const amount = dispenseAmounts[id] || 1;

                    return (
                      <tr key={id} className="hover:bg-primary/5">
                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                          <Pill className="w-4 h-4 text-primary shrink-0" />
                          {med.name}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {med.quantity}
                            </span>
                            {isOutOfStock ? (
                              <Badge variant="danger">Out of Stock</Badge>
                            ) : isLowStock ? (
                              <Badge variant="warning">Low Stock</Badge>
                            ) : (
                              <Badge variant="success">Available</Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono font-medium text-textPrimary">
                          ${Number(med.unitPrice).toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-textSecondary text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(med.expiryDate).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={med.quantity}
                              value={amount}
                              disabled={isOutOfStock}
                              onChange={(e) =>
                                handleDispenseAmountChange(id, Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 text-xs bg-surface border border-border rounded text-center focus:outline-none focus:border-primary disabled:opacity-50"
                            />
                            <Button
                              variant="secondary"
                              className="text-xs px-2.5 py-1"
                              disabled={isOutOfStock}
                              isLoading={updatingId === id}
                              onClick={() => handleReduceStock(med)}
                            >
                              <Minus className="w-3 h-3 mr-1" />
                              Dispense
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
          </div>
    </DashboardLayout>
  );
};
