import { Request, Response } from 'express';
import { LabReportModel } from '../../infrastructure/database/schemas/LabReport.schema';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';

export class LabReportController {
  public createReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;
      if (!user || !['admin', 'doctor', 'nurse'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Only authorized staff can create lab reports.' });
        return;
      }

      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'patientId is required in the URL parameters',
        });
        return;
      }

      const testName = typeof req.body.testName === 'string' ? req.body.testName.trim() : '';
      const result = typeof req.body.result === 'string' ? req.body.result.trim() : '';
      if (!testName || !result) {
        res.status(400).json({
          success: false,
          message: 'Test name and result are required.',
        });
        return;
      }

      const labReport = new LabReportModel({
        patientId,
        testName,
        result,
        uploadedAt: new Date(),
      });

      const savedReport = await labReport.save();

      res.status(201).json({
        success: true,
        message: 'Lab report created successfully',
        report: savedReport,
      });
    } catch (error: any) {
      console.error('[LabReport] createReport error caught in controller:');
      console.error('Error message:', error?.message);
      console.error('Stack trace  :', error?.stack);

      res.status(500).json({
        success: false,
        message: error?.message || 'Internal Server Error while saving lab report',
      });
    }
  };

  /**
   * Fetch all lab reports for a specific patient
   */
  public getReportsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'patientId is required in the URL parameters',
        });
        return;
      }

      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      if (user.role === 'patient' && user.linkedId !== patientId) {
        res.status(403).json({ success: false, message: 'You can only view your own lab reports.' });
        return;
      }
      if (!['admin', 'doctor', 'nurse', 'patient'].includes(user.role)) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      console.log(`[LabReport] Fetching lab reports for patientId: ${patientId}`);
      const reports = await LabReportModel.find({ patientId }).sort({ uploadedAt: -1 });

      res.status(200).json({
        success: true,
        reports,
      });
    } catch (error: any) {
      console.error('[LabReport] getReportsByPatient error caught in controller:');
      console.error('Error message:', error?.message);
      console.error('Stack trace  :', error?.stack);

      res.status(500).json({
        success: false,
        message: error?.message || 'Internal Server Error while fetching lab reports',
      });
    }
  };
}
