import { Router } from 'express';
import { getMarketplaceProductById, getMarketplaceProducts } from '../controllers/consumer-marketplace.controller.js';

const consumerMarketplaceRouter = Router();

consumerMarketplaceRouter.get('/products', getMarketplaceProducts);
consumerMarketplaceRouter.get('/product/:id', getMarketplaceProductById);

export { consumerMarketplaceRouter };
