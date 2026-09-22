import { Request, Response } from 'express';
import { PatientApplicationService } from '../../application/patient/PatientApplicationService';

export class PatientController {
  constructor(private readonly patientService: PatientApplicationService) {}

  public createPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { firstName, lastName, email, phone, dateOfBirth } = req.body;

      const patientId = await this.patientService.createPatient({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
      });

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        patientId,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create patient',
      });
    }
  };

  public getPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);
      const patient = await this.patientService.getPatient(patientId);

      res.status(200).json({
        success: true,
        data: {
          patientId: patient.patientId.getValue(),
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: patient.fullName,
          email: patient.email.getValue(),
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
        },
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Patient not found',
      });
    }
  };

  public getAllPatients = async (req: Request, res: Response): Promise<void> => {
    try {
      const patients = await this.patientService.getAllPatients();

      const data = patients.map((patient) => ({
        patientId: patient.patientId.getValue(),
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName: patient.fullName,
        email: patient.email.getValue(),
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve patients',
      });
    }
  };
}
