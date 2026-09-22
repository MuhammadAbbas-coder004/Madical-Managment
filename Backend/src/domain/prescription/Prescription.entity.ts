export interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionProps {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  medicines: Medicine[];
  diagnosis: string;
  createdAt?: Date;
}

export class Prescription {
  private readonly _prescriptionId: string;
  private readonly _patientId: string;
  private readonly _doctorId: string;
  private _medicines: Medicine[];
  private _diagnosis: string;
  private readonly _createdAt: Date;

  constructor(props: PrescriptionProps) {
    this._prescriptionId = props.prescriptionId;
    this._patientId = props.patientId;
    this._doctorId = props.doctorId;
    this._medicines = props.medicines;
    this._diagnosis = props.diagnosis;
    this._createdAt = props.createdAt || new Date();
  }

  public static create(props: PrescriptionProps): Prescription {
    if (!props.prescriptionId || props.prescriptionId.trim().length === 0) {
      throw new Error('PrescriptionId is required');
    }
    if (!props.patientId || props.patientId.trim().length === 0) {
      throw new Error('PatientId is required');
    }
    if (!props.doctorId || props.doctorId.trim().length === 0) {
      throw new Error('DoctorId is required');
    }
    if (!props.medicines || props.medicines.length === 0) {
      throw new Error('At least one medicine must be prescribed');
    }
    if (!props.diagnosis || props.diagnosis.trim().length === 0) {
      throw new Error('Diagnosis is required');
    }

    return new Prescription(props);
  }

  // Getters
  public get prescriptionId(): string {
    return this._prescriptionId;
  }

  public get patientId(): string {
    return this._patientId;
  }

  public get doctorId(): string {
    return this._doctorId;
  }

  public get medicines(): Medicine[] {
    return this._medicines;
  }

  public get diagnosis(): string {
    return this._diagnosis;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }
}
