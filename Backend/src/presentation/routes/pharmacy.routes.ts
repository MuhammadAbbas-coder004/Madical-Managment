import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { PharmacyController } from '../controllers/Pharmacy.controller';
import { PharmacyApplicationService } from '../../application/pharmacy/PharmacyApplicationService';
import { PharmacyRepository } from '../../infrastructure/database/repositories/PharmacyRepository';

const router = Router();
router.use(authMiddleware as any);
const repository = new PharmacyRepository();
const service = new PharmacyApplicationService(repository);
const controller = new PharmacyController(service);

// Get all medicines
router.get('/', controller.getAllMedicines.bind(controller));

// Add a new medicine
router.post('/', controller.addMedicine.bind(controller));

// Reduce stock (supporting both /:id/reduce-stock and /:medicineId/reduce-stock)
router.put('/:id/reduce-stock', controller.reduceStock.bind(controller));

// Get single medicine by id
router.get('/:id', controller.getMedicineById.bind(controller));

export default router;
