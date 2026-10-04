import { Request, Response } from 'express';
import { BillingApplicationService } from '../../application/billing/BillingApplicationService';
import { CreateInvoiceDTO } from '../../application/billing/CreateInvoiceDTO';

export class BillingController {
  constructor(private readonly service: BillingApplicationService) {}

  async createInvoice(req: Request, res: Response): Promise<void> {
    const dto: CreateInvoiceDTO = req.body;
    try {
      const id = await this.service.createInvoice(dto);
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  async markInvoicePaid(req: Request, res: Response): Promise<void> {
    const invoiceId = req.params.invoiceId as string;
    try {
      await this.service.markInvoicePaid(invoiceId);
      res.status(200).json({ message: 'Invoice marked as paid' });
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  }

  async getInvoicesByPatient(req: Request, res: Response): Promise<void> {
    const patientId = req.params.patientId as string;
    try {
      const invoices = await this.service.getInvoicesByPatient(patientId);
      const data = invoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        patientId: inv.patientId,
        appointmentId: inv.appointmentId,
        items: inv.items,
        totalAmount: inv.totalAmount,
        status: inv.status,
        createdAt: inv.createdAt,
      }));
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  async getAllInvoices(req: Request, res: Response): Promise<void> {
    try {
      const invoices = await this.service.getAllInvoices();
      const data = invoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        patientId: inv.patientId,
        appointmentId: inv.appointmentId,
        items: inv.items,
        totalAmount: inv.totalAmount,
        status: inv.status,
        createdAt: inv.createdAt,
      }));
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  async getInvoiceById(req: Request, res: Response): Promise<void> {
    const invoiceId = req.params.invoiceId as string;
    try {
      const invoice = await this.service.getInvoiceById(invoiceId);
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      res.json({
        invoiceId: invoice.invoiceId,
        patientId: invoice.patientId,
        appointmentId: invoice.appointmentId,
        items: invoice.items,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        createdAt: invoice.createdAt,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
