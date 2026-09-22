import { randomUUID } from 'crypto';
import { Medicine } from '../../domain/pharmacy/Medicine.entity';
import { IPharmacyRepository } from '../../domain/pharmacy/IPharmacyRepository';
import { AddMedicineDTO } from './AddMedicineDTO';

export class PharmacyApplicationService {
  constructor(private readonly pharmacyRepo: IPharmacyRepository) {}

  public async addMedicine(dto: AddMedicineDTO): Promise<string> {
    const medicine = Medicine.create({
      name: dto.name,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      expiryDate: new Date(dto.expiryDate),
    });
    const id = randomUUID();
    medicine.medicineId = id;
    await this.pharmacyRepo.save(medicine);
    return id;
  }

  public async getAllMedicines(): Promise<Medicine[]> {
    return await this.pharmacyRepo.findAll();
  }

  public async reduceStock(medicineId: string, amount: number): Promise<void> {
    const medicine = await this.pharmacyRepo.findById(medicineId);
    if (!medicine) {
      throw new Error('Medicine not found');
    }
    medicine.reduceStock(amount);
    await this.pharmacyRepo.update(medicine);
  }
}
