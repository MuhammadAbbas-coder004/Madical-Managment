import { Request, Response } from 'express';
import { PharmacyApplicationService } from '../../application/pharmacy/PharmacyApplicationService';
import { AddMedicineDTO } from '../../application/pharmacy/AddMedicineDTO';

export class PharmacyController {
  constructor(private readonly service: PharmacyApplicationService) {}

  async addMedicine(req: Request, res: Response): Promise<void> {
    const dto: AddMedicineDTO = req.body;
    try {
      const id = await this.service.addMedicine(dto);
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  async getAllMedicines(req: Request, res: Response): Promise<void> {
    try {
      const medicines = await this.service.getAllMedicines();
      res.json(medicines);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  async reduceStock(req: Request, res: Response): Promise<void> {
    const medicineId = req.params.medicineId as string;
    const { amount } = req.body; // expecting { amount: number }
    try {
      await this.service.reduceStock(medicineId, amount);
      res.status(200).json({ message: 'Stock reduced' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
