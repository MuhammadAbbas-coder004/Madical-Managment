import React, { useRef,  useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, FileText, Calendar, ExternalLink } from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

interface LabReport {
  _id: string;
  patientId: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
}

export const LabReportListPage: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(false);

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

    const fetchReports = async () => {
      try {
        setLoading(true);
        const res: any = await api.get(`/lab-reports/patient/${selectedPatientId}`);
        setReports(res.reports || res.data || []);
      } catch (err: any) {
        toast.error('Failed to fetch patient lab reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedPatientId]);

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef, [loading]);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Diagnostic Lab Reports</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            Blood work, radiology scans, and laboratory documentation.
          </p>
        </div>

        <Link
          to="/lab-reports/upload"
          className="inline-flex items-center justify-center text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload New Report
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
          <span className="ml-3 text-sm text-textSecondary">Loading lab reports...</span>
        </div>
      )}

      {!loading && (
        <div>
          {reports.length === 0 ? (
            <Card>
              <p className="text-center text-textSecondary text-sm py-6">
                No diagnostic reports uploaded yet for this patient.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => {
                const fileUrl = `http://localhost:5000/uploads/${report.fileName}`;
                const isImage = /\.(jpg|jpeg|png)$/i.test(report.fileName);

                return (
                  <Card key={report._id} className="flex flex-col justify-between">
                    <div>
                      <div className="h-32 w-full bg-slate-50 border border-border rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {isImage ? (
                          <img
                            src={fileUrl}
                            alt="Lab scan preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-textSecondary">
                            <FileText className="w-10 h-10 text-primary mb-1" />
                            <span className="text-xs font-semibold uppercase">PDF Document</span>
                          </div>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-textPrimary truncate" title={report.fileName}>
                        {report.fileName}
                      </h4>
                      <p className="text-xs text-textSecondary flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(report.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-border">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                      >
                        Open Full Document
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
          </div>
    </DashboardLayout>
  );
};
