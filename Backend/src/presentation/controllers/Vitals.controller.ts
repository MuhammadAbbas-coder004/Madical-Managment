import { Request, Response } from 'express';
import { VitalsApplicationService } from '../../application/vitals/VitalsApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';

export class VitalsController {
  constructor(private readonly vitalsService: VitalsApplicationService) {}

  public recordVitals = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;
      if (!user || user.role !== 'doctor') {
        res.status(403).json({ success: false, message: 'Only doctors can record vitals' });
        return;
      }

      const {
        patientId,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        sugarLevel,
        temperature,
        heartRate,
        pulseRate,
        rbcCount,
        wbcCount,
      } = req.body;

      const analysisResult = await this.vitalsService.recordVitals({
        patientId,
        bloodPressureSystolic: Number(bloodPressureSystolic),
        bloodPressureDiastolic: Number(bloodPressureDiastolic),
        sugarLevel: Number(sugarLevel),
        temperature: Number(temperature),
        heartRate: Number(heartRate),
        pulseRate: Number(pulseRate),
        rbcCount: Number(rbcCount),
        wbcCount: Number(wbcCount),
      });

      res.status(201).json({
        success: true,
        message: 'Vitals recorded and analyzed successfully',
        analysis: analysisResult,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to record vitals',
      });
    }
  };

  public getVitalsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);
      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (user.role === 'patient' && user.linkedId !== patientId) {
        res.status(403).json({ success: false, message: 'You can only view your own vitals' });
        return;
      }
      if (!['patient', 'doctor', 'admin'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      const vitalsList = await this.vitalsService.getVitalsByPatient(patientId);

      const data = vitalsList.map((v) => ({
        vitalsId: v.vitalsId,
        patientId: v.patientId,
        bloodPressureSystolic: v.bloodPressureSystolic,
        bloodPressureDiastolic: v.bloodPressureDiastolic,
        sugarLevel: v.sugarLevel,
        temperature: v.temperature,
        heartRate: v.heartRate,
        pulseRate: v.pulseRate,
        rbcCount: v.rbcCount,
        wbcCount: v.wbcCount,
        recordedAt: v.recordedAt,
        analysis: v.analysisResult,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch patient vitals',
      });
    }
  };
}
