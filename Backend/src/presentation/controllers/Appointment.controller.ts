import { Request, Response } from 'express';
import { AppointmentApplicationService } from '../../application/appointment/AppointmentApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { PatientModel } from '../../infrastructure/database/schemas/Patient.schema';
import { DoctorModel } from '../../infrastructure/database/schemas/Doctor.schema';

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentApplicationService) {}

  private getAuthenticatedUser = async (req: Request) => {
    const userId = (req as AuthenticatedRequest).user?.userId;
    return userId ? UserModel.findById(userId) : null;
  };

  private getPatientProfileId = async (email: string) => {
    const patient = await PatientModel.findOne({ email });
    return patient?.patientId;
  };

  private getDoctorProfileId = async (email: string) => {
    const doctor = await DoctorModel.findOne({ email });
    return doctor?.doctorId;
  };

  public bookAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, doctorId, appointmentDate, notes } = req.body;
      const user = await this.getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      if (user.role === 'patient') {
        const ownPatientId = await this.getPatientProfileId(user.email);
        if (!ownPatientId || ownPatientId !== patientId) {
          res.status(403).json({ success: false, message: 'You can only book appointments for yourself' });
          return;
        }
      } else if (user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      const appointmentId = await this.appointmentService.bookAppointment({
        patientId,
        doctorId,
        appointmentDate,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        appointmentId,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to book appointment',
      });
    }
  };

  public cancelAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = String(req.params.appointmentId);
      const user = await this.getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const appointment = await this.appointmentService.getAppointmentById(appointmentId);
      if (!appointment) {
        res.status(404).json({ success: false, message: 'Appointment not found' });
        return;
      }
      if (user.role === 'patient') {
        const ownPatientId = await this.getPatientProfileId(user.email);
        if (!ownPatientId || appointment.patientId !== ownPatientId) {
          res.status(403).json({ success: false, message: 'You can only cancel your own appointments' });
          return;
        }
      } else if (user.role === 'doctor') {
        const ownDoctorId = await this.getDoctorProfileId(user.email);
        if (!ownDoctorId || appointment.doctorId !== ownDoctorId) {
          res.status(403).json({ success: false, message: 'You can only cancel your own appointments' });
          return;
        }
      } else if (user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      await this.appointmentService.cancelAppointment(appointmentId);

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel appointment',
      });
    }
  };

  public getAppointmentsByPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = String(req.params.patientId);
      const user = await this.getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      if (user.role === 'patient') {
        const ownPatientId = await this.getPatientProfileId(user.email);
        if (!ownPatientId || ownPatientId !== patientId) {
          res.status(403).json({ success: false, message: 'You can only view your own appointments' });
          return;
        }
      } else if (user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      const appointments = await this.appointmentService.getAppointmentsByPatient(patientId);

      const data = appointments.map((app) => ({
        appointmentId: app.appointmentId,
        patientId: app.patientId,
        doctorId: app.doctorId,
        appointmentDate: app.appointmentDate,
        status: app.status,
        notes: app.notes,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch appointments',
      });
    }
  };

  public getAppointmentsByDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
      const doctorId = String(req.params.doctorId);
      const user = await this.getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      if (user.role === 'doctor') {
        const ownDoctorId = await this.getDoctorProfileId(user.email);
        if (!ownDoctorId || ownDoctorId !== doctorId) {
          res.status(403).json({ success: false, message: 'You can only view your own appointments' });
          return;
        }
      } else if (user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      const appointments = await this.appointmentService.getAppointmentsByDoctor(doctorId);

      const data = appointments.map((app) => ({
        appointmentId: app.appointmentId,
        patientId: app.patientId,
        doctorId: app.doctorId,
        appointmentDate: app.appointmentDate,
        status: app.status,
        notes: app.notes,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch appointments',
      });
    }
  };

  public getAllAppointments = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      if (user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      const appointments = await this.appointmentService.getAllAppointments();

      const data = appointments.map((app) => ({
        appointmentId: app.appointmentId,
        patientId: app.patientId,
        doctorId: app.doctorId,
        appointmentDate: app.appointmentDate,
        status: app.status,
        notes: app.notes,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch appointments',
      });
    }
  };

  public getAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = String(req.params.appointmentId);
      const user = await this.getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const appointment = await this.appointmentService.getAppointmentById(appointmentId);

      if (!appointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found',
        });
        return;
      }

      if (user.role === 'patient') {
        const ownPatientId = await this.getPatientProfileId(user.email);
        if (!ownPatientId || appointment.patientId !== ownPatientId) {
          res.status(403).json({ success: false, message: 'You can only view your own appointments' });
          return;
        }
      } else if (user.role === 'doctor') {
        const ownDoctorId = await this.getDoctorProfileId(user.email);
        if (!ownDoctorId || appointment.doctorId !== ownDoctorId) {
          res.status(403).json({ success: false, message: 'You can only view your own appointments' });
          return;
        }
      } else if (user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          appointmentId: appointment.appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentDate: appointment.appointmentDate,
          status: appointment.status,
          notes: appointment.notes,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch appointment',
      });
    }
  };
}
