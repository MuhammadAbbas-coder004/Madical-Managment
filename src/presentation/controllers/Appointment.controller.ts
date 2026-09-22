import { Request, Response } from 'express';
import { AppointmentApplicationService } from '../../application/appointment/AppointmentApplicationService';

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentApplicationService) {}

  public bookAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, doctorId, appointmentDate, notes } = req.body;

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
}
