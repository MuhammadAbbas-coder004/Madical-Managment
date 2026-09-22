export class PatientId {
  private readonly value: string;

  constructor(id: string) {
    if (!id || id.trim().length === 0) {
      throw new Error('PatientId cannot be empty');
    }
    this.value = id.trim();
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: PatientId): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value;
  }
}
