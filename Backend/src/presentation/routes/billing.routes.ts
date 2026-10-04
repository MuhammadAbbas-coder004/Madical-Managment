import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { BillingController } from '../controllers/Billing.controller';
import { BillingApplicationService } from '../../application/billing/BillingApplicationService';
import { BillingRepository } from '../../infrastructure/database/repositories/BillingRepository';

const router = Router();
router.use(authMiddleware as any);
const service = new BillingApplicationService(new BillingRepository());
const controller = new BillingController(service);

// Get all invoices
router.get('/', controller.getAllInvoices.bind(controller));

// Create a new invoice
router.post('/', controller.createInvoice.bind(controller));

// Mark invoice as paid
router.put('/:invoiceId/pay', controller.markInvoicePaid.bind(controller));

// Get invoices by patient
router.get('/patient/:patientId', controller.getInvoicesByPatient.bind(controller));

// Get single invoice by ID
router.get('/:invoiceId', controller.getInvoiceById.bind(controller));

export default router;
