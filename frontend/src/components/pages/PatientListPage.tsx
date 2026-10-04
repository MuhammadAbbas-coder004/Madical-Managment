import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ArrowRight } from 'lucide-react';
import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { SearchBar } from '../molecules/SearchBar';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface Patient {
  patientId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
}

export const PatientListPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/patients') as Patient[] | { data: Patient[] };
        setPatients(Array.isArray(res) ? res : (res as { data: Patient[] }).data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filtered = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Patients Directory</h1>
          <p className="text-sm text-textSecondary mt-0.5">View, search, and manage registered clinic patients.</p>
        </div>
        <Link to="/patients/new" className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          <UserPlus className="w-4 h-4 mr-2" />Register Patient
        </Link>
      </div>
      <div className="mb-6 max-w-md">
        <SearchBar value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by patient name or email..." />
      </div>
      {loading && <div className="flex items-center justify-center py-16 text-primary"><Spinner size="lg" /><span className="ml-3 text-sm text-textSecondary">Loading patients...</span></div>}
      {!loading && error && <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-md text-sm mb-6">{error}</div>}
      {!loading && !error && (
        <Card className="!p-0 overflow-hidden">
          {filtered.length === 0
            ? <div className="p-8 text-center text-textSecondary text-sm">No patients found matching your search.</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background border-b border-textPrimary/10 text-xs uppercase font-semibold text-textSecondary">
                    <tr>
                      <th className="px-6 py-3">Patient Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Phone</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-textPrimary">
                    {filtered.map((p) => (
                      <tr key={p.patientId} className="hover:bg-primary/5">
                        <td className="px-6 py-4 font-medium">{p.fullName || `${p.firstName} ${p.lastName}`}</td>
                        <td className="px-6 py-4 text-textSecondary">{p.email}</td>
                        <td className="px-6 py-4 text-textSecondary">{p.phone || 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/patients/${p.patientId}`} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
                            View Details<ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    ))}
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
