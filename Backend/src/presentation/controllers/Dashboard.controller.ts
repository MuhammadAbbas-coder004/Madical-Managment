import { Request, Response } from 'express';
import { PatientModel } from '../../infrastructure/database/schemas/Patient.schema';
import { DoctorModel } from '../../infrastructure/database/schemas/Doctor.schema';
import { AppointmentModel } from '../../infrastructure/database/schemas/Appointment.schema';
import { VitalsModel } from '../../infrastructure/database/schemas/Vitals.schema';

export class DashboardController {
  public getStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [
        totalPatients,
        totalDoctors,
        totalAppointments,
        appointmentsToday,
        criticalVitalsCount,
      ] = await Promise.all([
        PatientModel.countDocuments(),
        DoctorModel.countDocuments(),
        AppointmentModel.countDocuments(),
        AppointmentModel.countDocuments({
          appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        }),
        VitalsModel.countDocuments({ status: 'critical' }),
      ]);

      res.status(200).json({
        totalPatients,
        totalDoctors,
        totalAppointments,
        appointmentsToday,
        criticalVitalsCount,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Failed to fetch dashboard statistics',
      });
    }
  };
}
