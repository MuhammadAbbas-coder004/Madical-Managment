import { Router } from 'express';
import { DoctorRepository } from '../../infrastructure/database/repositories/DoctorRepository';
import { DoctorApplicationService } from '../../application/doctor/DoctorApplicationService';
import { DoctorController } from '../controllers/Doctor.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const doctorRouter = Router();

// Protect doctor routes with auth middleware
doctorRouter.use(authMiddleware as any);

// Dependency Injection
const doctorRepository = new DoctorRepository();
const doctorService = new DoctorApplicationService(doctorRepository);
const doctorController = new DoctorController(doctorService);

// Route definitions
doctorRouter.post('/', doctorController.createDoctor);
doctorRouter.get('/:doctorId', doctorController.getDoctor);
doctorRouter.get('/', doctorController.getAllDoctors);

export default doctorRouter;
