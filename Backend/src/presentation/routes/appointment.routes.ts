import { Router } from 'express';
import { AppointmentRepository } from '../../infrastructure/database/repositories/AppointmentRepository';
import { AppointmentApplicationService } from '../../application/appointment/AppointmentApplicationService';
import { AppointmentController } from '../controllers/Appointment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const appointmentRouter = Router();

// Protect appointment routes with auth middleware
appointmentRouter.use(authMiddleware as any);

// Dependency Injection
const appointmentRepository = new AppointmentRepository();
const appointmentService = new AppointmentApplicationService(appointmentRepository);
const appointmentController = new AppointmentController(appointmentService);

// Route definitions
appointmentRouter.post('/', appointmentController.bookAppointment);
appointmentRouter.put('/:appointmentId/cancel', appointmentController.cancelAppointment);
appointmentRouter.get('/patient/:patientId', appointmentController.getAppointmentsByPatient);
appointmentRouter.get('/doctor/:doctorId', appointmentController.getAppointmentsByDoctor);

export default appointmentRouter;
