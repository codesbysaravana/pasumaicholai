import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { createListing, getMyListings } from '../modules/marketplace/marketplace.controller.js';

const farmerMarketplaceRouter = Router();

farmerMarketplaceRouter.post('/create-listing', requireAuth, requireRole('farmer'), createListing);
farmerMarketplaceRouter.get('/my-listings', requireAuth, requireRole('farmer'), getMyListings);

export { farmerMarketplaceRouter };
