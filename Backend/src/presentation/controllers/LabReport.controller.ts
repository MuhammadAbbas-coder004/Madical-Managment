import { Request, Response } from 'express';
import { LabReportModel } from '../../infrastructure/database/schemas/LabReport.schema';

export class LabReportController {
  /**
   * Upload a lab report for a patient
   * Expects req.file from multer and patientId from req.params
   */
  public uploadReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'patientId is required in the URL parameters',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded. Make sure the form field name is "file"',
        });
        return;
      }

      console.log(`[LabReport] Uploading file for patientId: ${patientId}`, {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      // Save report info to database
      const labReport = new LabReportModel({
        patientId,
        fileName: req.file.filename || req.file.originalname,
        filePath: req.file.path,
        uploadedAt: new Date(),
      });

      const savedReport = await labReport.save();
      console.log(`[LabReport] Successfully saved report with ID: ${savedReport._id}`);

      res.status(201).json({
        success: true,
        message: 'Lab report uploaded successfully',
        report: savedReport,
      });
    } catch (error: any) {
      console.error('[LabReport] uploadReport error caught in controller:');
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
