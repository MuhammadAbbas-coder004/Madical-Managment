import { Router } from 'express';
import { LabReportController } from '../controllers/LabReport.controller';
import { upload } from '../../infrastructure/upload/multerConfig';

const labReportRouter = Router();
const labReportController = new LabReportController();

// POST /upload/:patientId - Upload lab report (the form-data field name must be "file")
labReportRouter.post(
  '/upload/:patientId',
  upload.single('file'),
  labReportController.uploadReport
);

// GET /patient/:patientId - Get all reports for a given patient
labReportRouter.get(
  '/patient/:patientId',
  labReportController.getReportsByPatient
);

export default labReportRouter;
