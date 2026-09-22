import { Router } from 'express';
import { VitalsRepository } from '../../infrastructure/database/repositories/VitalsRepository';
import { VitalsApplicationService } from '../../application/vitals/VitalsApplicationService';
import { VitalsController } from '../controllers/Vitals.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const vitalsRouter = Router();

// Protect vitals routes with auth middleware
vitalsRouter.use(authMiddleware as any);

// Dependency Injection
const vitalsRepository = new VitalsRepository();
const vitalsService = new VitalsApplicationService(vitalsRepository);
const vitalsController = new VitalsController(vitalsService);

// Route definitions
vitalsRouter.post('/', vitalsController.recordVitals);
vitalsRouter.get('/patient/:patientId', vitalsController.getVitalsByPatient);

export default vitalsRouter;
