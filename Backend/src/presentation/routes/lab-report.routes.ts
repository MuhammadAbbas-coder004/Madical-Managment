import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { LabReportController } from '../controllers/LabReport.controller';

const labReportRouter = Router();
labReportRouter.use(authMiddleware as any);
const labReportController = new LabReportController();

// POST /patient/:patientId - Create a text-based lab report
labReportRouter.post('/patient/:patientId', labReportController.createReport);

// GET /patient/:patientId - Get all reports for a given patient
labReportRouter.get(
  '/patient/:patientId',
  labReportController.getReportsByPatient
);

export default labReportRouter;
