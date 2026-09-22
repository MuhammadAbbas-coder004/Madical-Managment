export interface MedicineItem {
  description: string;
  amount: number;
}

export interface MedicineProps {
  medicineId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  expiryDate: Date;
}

export class Medicine {
  private _medicineId: string;
  private _name: string;
  private _quantity: number;
  private _unitPrice: number;
  private _expiryDate: Date;

  constructor(props: MedicineProps) {
    this._medicineId = props.medicineId;
    this._name = props.name;
    this._quantity = props.quantity;
    this._unitPrice = props.unitPrice;
    this._expiryDate = props.expiryDate;
  }

  public static create(dto: { name: string; quantity: number; unitPrice: number; expiryDate: Date }): Medicine {
    return new Medicine({
      medicineId: '', // will be set by service/repo
      name: dto.name,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      expiryDate: dto.expiryDate,
    });
  }

  // Getters
  public get medicineId(): string { return this._medicineId; }
  public get name(): string { return this._name; }
  public get quantity(): number { return this._quantity; }
  public get unitPrice(): number { return this._unitPrice; }
  public get expiryDate(): Date { return this._expiryDate; }

  // Mutators
  public set medicineId(id: string) { this._medicineId = id; }

  public reduceStock(amount: number): void {
    if (amount > this._quantity) {
      throw new Error('Insufficient stock');
    }
    this._quantity -= amount;
  }
}
