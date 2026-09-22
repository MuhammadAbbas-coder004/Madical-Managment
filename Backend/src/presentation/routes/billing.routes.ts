import { Router } from 'express';
import { BillingController } from '../controllers/Billing.controller';
import { BillingApplicationService } from '../../application/billing/BillingApplicationService';
import { BillingRepository } from '../../infrastructure/database/repositories/BillingRepository';

const router = Router();
const service = new BillingApplicationService(new BillingRepository());
const controller = new BillingController(service);

// Create a new invoice
router.post('/', controller.createInvoice.bind(controller));

// Mark invoice as paid
router.put('/:invoiceId/pay', controller.markInvoicePaid.bind(controller));

// Get invoices by patient
router.get('/patient/:patientId', controller.getInvoicesByPatient.bind(controller));

export default router;
