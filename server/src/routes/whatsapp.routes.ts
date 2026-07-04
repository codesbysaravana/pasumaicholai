import express, { Router } from 'express';
import { handleWhatsappGrievance } from '../controllers/whatsappController.js';

const whatsappRouter = Router();

whatsappRouter.post('/grievance', express.urlencoded({ extended: false }), handleWhatsappGrievance);

export { whatsappRouter };
