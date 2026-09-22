import { Request, Response } from 'express';
import { LabReportModel } from '../../infrastructure/database/schemas/LabReport.schema';

export class LabReportController {
  public uploadReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const labReport = new LabReportModel({
        patientId,
        fileName: req.file.originalname,
        filePath: req.file.path,
      });

      await labReport.save();

      res.status(201).json({
        success: true,
        message: 'Lab report uploaded successfully',
        report: {
          id: labReport._id,
          patientId: labReport.patientId,
          fileName: labReport.fileName,
          filePath: labReport.filePath,
          uploadedAt: labReport.uploadedAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload lab report',
      });
    }
  };

  public getReportsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);
      const reports = await LabReportModel.find({ patientId }).sort({ uploadedAt: -1 });

      const data = reports.map((r) => ({
        id: r._id,
        patientId: r.patientId,
        fileName: r.fileName,
        filePath: r.filePath,
        uploadedAt: r.uploadedAt,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch lab reports',
      });
    }
  };
}
