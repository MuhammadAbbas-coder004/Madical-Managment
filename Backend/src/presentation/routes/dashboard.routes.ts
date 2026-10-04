import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { DashboardController } from '../controllers/Dashboard.controller';

const dashboardRouter = Router();
dashboardRouter.use(authMiddleware as any);
const dashboardController = new DashboardController();

// Route definitions - handles both GET / and GET /stats when mounted at /api/dashboard
dashboardRouter.get('/', dashboardController.getStats);
dashboardRouter.get('/stats', dashboardController.getStats);

export default dashboardRouter;
