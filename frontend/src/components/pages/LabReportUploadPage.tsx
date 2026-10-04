import React, { useRef,  useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadCloud, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

import api from '../../shared/services/api';
import { DashboardLayout } from '../templates/DashboardLayout';
import { Card } from '../molecules/Card';
import { Label } from '../atoms/Label';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const LabReportUploadPage: React.FC = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);
        const res: any = await api.get('/patients');
        const list = Array.isArray(res) ? res : res.data || [];
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0].patientId);
        }
      } catch (err) {
        toast.error('Failed to load patients list');
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    if (!selectedFile) {
      toast.error('Please choose a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.post(`/lab-reports/upload/${selectedPatientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Lab report uploaded successfully!');
      navigate('/lab-reports');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload lab report');
    } finally {
      setIsUploading(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <DashboardLayout>
      <div ref={containerRef}>
      <div className="max-w-2xl mx-auto">
        <Link
          to="/lab-reports"
          className="inline-flex items-center text-xs font-semibold text-textSecondary hover:text-textPrimary mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Reports List
        </Link>

        <h1 className="text-2xl font-bold text-textPrimary mb-6">
          Upload Patient Diagnostic Report
        </h1>

        {loadingPatients ? (
          <div className="flex items-center justify-center py-16 text-primary">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-textSecondary">Loading patients...</span>
          </div>
        ) : (
          <Card>
            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <Label htmlFor="uploadPatient" required>
                  Select Patient
                </Label>
                <select
                  id="uploadPatient"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary"
                  required
                >
                  {patients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.fullName || `${p.firstName} ${p.lastName}`} (ID: {p.patientId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="reportFile" required>
                  Diagnostic File (PDF, JPG, PNG)
                </Label>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-lg hover:border-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-10 w-10 text-textSecondary" />
                    <div className="flex text-sm text-textSecondary justify-center">
                      <label
                        htmlFor="reportFile"
                        className="relative cursor-pointer rounded-md font-medium text-primary hover:underline focus-within:outline-none"
                      >
                        <span>Choose a file</span>
                        <input
                          id="reportFile"
                          name="file"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={handleFileChange}
                          required
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-textSecondary">
                      PDF, PNG, JPG up to 10MB
                    </p>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-3 p-3 bg-slate-50 border border-border rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-textPrimary truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-textSecondary">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/lab-reports')}
                >
                  Cancel
                </Button>

                <Button type="submit" variant="primary" isLoading={isUploading}>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload Report
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
