import { Request, Response } from 'express';
import { MedicalRecordApplicationService } from '../../application/medical-record/MedicalRecordApplicationService';

export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordApplicationService) {}

  public createRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, doctorId, diagnosis, notes, allergies } = req.body;

      const recordId = await this.medicalRecordService.createRecord({
        patientId,
        doctorId,
        diagnosis,
        notes,
        allergies: allergies || [],
      });

      res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        recordId,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create medical record',
      });
    }
  };

  public getRecordsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);
      const records = await this.medicalRecordService.getRecordsByPatient(patientId);

      const data = records.map((r) => ({
        recordId: r.recordId,
        patientId: r.patientId,
        doctorId: r.doctorId,
        diagnosis: r.diagnosis,
        notes: r.notes,
        allergies: r.allergies,
        createdAt: r.createdAt,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch medical records',
      });
    }
  };
}
