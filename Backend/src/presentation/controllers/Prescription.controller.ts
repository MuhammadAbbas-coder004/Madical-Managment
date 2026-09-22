import { Request, Response } from 'express';
import { PrescriptionApplicationService } from '../../application/prescription/PrescriptionApplicationService';

export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionApplicationService) {}

  public createPrescription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, doctorId, medicines, diagnosis } = req.body;

      const prescriptionId = await this.prescriptionService.createPrescription({
        patientId,
        doctorId,
        medicines,
        diagnosis,
      });

      res.status(201).json({
        success: true,
        message: 'Prescription created successfully',
        prescriptionId,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create prescription',
      });
    }
  };

  public getPrescriptionsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);
      const prescriptions = await this.prescriptionService.getPrescriptionsByPatient(patientId);

      const data = prescriptions.map((p) => ({
        prescriptionId: p.prescriptionId,
        patientId: p.patientId,
        doctorId: p.doctorId,
        medicines: p.medicines,
        diagnosis: p.diagnosis,
        createdAt: p.createdAt,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch patient prescriptions',
      });
    }
  };

  public getPrescriptionsByDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorId = String(req.params.doctorId);
      const prescriptions = await this.prescriptionService.getPrescriptionsByDoctor(doctorId);

      const data = prescriptions.map((p) => ({
        prescriptionId: p.prescriptionId,
        patientId: p.patientId,
        doctorId: p.doctorId,
        medicines: p.medicines,
        diagnosis: p.diagnosis,
        createdAt: p.createdAt,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch doctor prescriptions',
      });
    }
  };
}
