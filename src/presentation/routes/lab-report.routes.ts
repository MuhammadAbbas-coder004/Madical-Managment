import { Router } from 'express';
import { LabReportController } from '../controllers/LabReport.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../../infrastructure/upload/multerConfig';

const labReportRouter = Router();

// Protect routes with auth middleware
labReportRouter.use(authMiddleware as any);

const labReportController = new LabReportController();

// Route definitions
labReportRouter.post('/upload/:patientId', upload.single('file'), labReportController.uploadReport);
labReportRouter.get('/patient/:patientId', labReportController.getReportsByPatient);

export default labReportRouter;
