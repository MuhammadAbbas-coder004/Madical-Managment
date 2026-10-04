import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FilePlus, Calendar, AlertOctagon, User } from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface MedicalRecord {
  recordId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  notes: string;
  allergies: string[];
  createdAt: string;
}

interface Doctor { doctorId: string; firstName?: string; lastName?: string; fullName?: string; specialization?: string; }

export const MedicalRecordListPage: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorMap, setDoctorMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [patRes, docRes]: any[] = await Promise.all([
          api.get('/patients'),
          api.get('/doctors'),
        ]);
        const patList = Array.isArray(patRes) ? patRes : patRes.data || [];
        setPatients(patList);
        if (patList.length > 0) setSelectedPatientId(patList[0].patientId);

        const docList: Doctor[] = Array.isArray(docRes) ? docRes : docRes.data || [];
        const map = new Map<string, string>();
        docList.forEach((d) => {
          const name = d.fullName || `Dr. ${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown Doctor';
          const label = d.specialization ? `${name} (${d.specialization})` : name;
          map.set(d.doctorId, label);
        });
        setDoctorMap(map);
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res: any = await api.get(`/medical-records/patient/${selectedPatientId}`);
        const data = Array.isArray(res) ? res : res.data || [];
        setRecords(data);
      } catch (err: any) {
        toast.error('Failed to load medical records');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedPatientId]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Medical Records (EMR)</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            Electronic health histories, diagnoses, allergies, and physician notes.
          </p>
        </div>

        <Link
          to="/medical-records/new"
          className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <FilePlus className="w-4 h-4 mr-2" />
          Add Medical Record
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
              {(p.fullName || `${p.firstName || ''} ${p.lastName || ''}`).trim() || 'Unnamed Patient'}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-primary">
          <Spinner size="lg" />
          <span className="ml-3 text-sm text-textSecondary">Loading medical history...</span>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {records.length === 0 ? (
            <Card>
              <p className="text-center text-textSecondary text-sm py-4">
                No medical records found for this patient.
              </p>
            </Card>
          ) : (
            records.map((rec) => (
              <Card key={rec.recordId} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <h3 className="text-base font-bold text-textPrimary">
                      {rec.diagnosis}
                    </h3>
                    <p className="text-xs text-textSecondary flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5" /> Doctor: {doctorMap.get(rec.doctorId) || rec.doctorId}
                    </p>
                  </div>
                  <span className="text-xs text-textSecondary flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {rec.allergies && rec.allergies.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-danger flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" /> Allergies:
                    </span>
                    {rec.allergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="text-xs bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded-full font-medium"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                )}

                <div className="bg-background p-3 rounded-md border border-textPrimary/10">
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Doctor's Notes
                  </p>
                  <p className="text-sm text-textPrimary whitespace-pre-line">
                    {rec.notes || 'No additional notes provided.'}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
          </div>
    </DashboardLayout>
  );
};
