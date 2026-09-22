import { VitalsAnalysisResult } from './VitalsAnalysisResult';

export interface VitalsProps {
  vitalsId: string;
  patientId: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  sugarLevel: number;
  temperature: number;
  heartRate: number;
  pulseRate: number;
  rbcCount: number;
  wbcCount: number;
  recordedAt?: Date;
  analysisResult?: VitalsAnalysisResult;
}

export class Vitals {
  private readonly _vitalsId: string;
  private readonly _patientId: string;
  private readonly _bloodPressureSystolic: number;
  private readonly _bloodPressureDiastolic: number;
  private readonly _sugarLevel: number;
  private readonly _temperature: number;
  private readonly _heartRate: number;
  private readonly _pulseRate: number;
  private readonly _rbcCount: number;
  private readonly _wbcCount: number;
  private readonly _recordedAt: Date;
  private _analysisResult?: VitalsAnalysisResult;

  constructor(props: VitalsProps) {
    this._vitalsId = props.vitalsId;
    this._patientId = props.patientId;
    this._bloodPressureSystolic = props.bloodPressureSystolic;
    this._bloodPressureDiastolic = props.bloodPressureDiastolic;
    this._sugarLevel = props.sugarLevel;
    this._temperature = props.temperature;
    this._heartRate = props.heartRate;
    this._pulseRate = props.pulseRate;
    this._rbcCount = props.rbcCount;
    this._wbcCount = props.wbcCount;
    this._recordedAt = props.recordedAt || new Date();
    this._analysisResult = props.analysisResult;
  }

  public static create(props: VitalsProps): Vitals {
    if (!props.vitalsId || props.vitalsId.trim().length === 0) {
      throw new Error('VitalsId is required');
    }
    if (!props.patientId || props.patientId.trim().length === 0) {
      throw new Error('PatientId is required');
    }
    return new Vitals(props);
  }

  // Getters
  public get vitalsId(): string {
    return this._vitalsId;
  }

  public get patientId(): string {
    return this._patientId;
  }

  public get bloodPressureSystolic(): number {
    return this._bloodPressureSystolic;
  }

  public get bloodPressureDiastolic(): number {
    return this._bloodPressureDiastolic;
  }

  public get sugarLevel(): number {
    return this._sugarLevel;
  }

  public get temperature(): number {
    return this._temperature;
  }

  public get heartRate(): number {
    return this._heartRate;
  }

  public get pulseRate(): number {
    return this._pulseRate;
  }

  public get rbcCount(): number {
    return this._rbcCount;
  }

  public get wbcCount(): number {
    return this._wbcCount;
  }

  public get recordedAt(): Date {
    return this._recordedAt;
  }

  public get analysisResult(): VitalsAnalysisResult | undefined {
    return this._analysisResult;
  }
}
