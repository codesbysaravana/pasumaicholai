import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import {
  createListing,
  deleteListing,
  getListingById,
  getListings,
  getMyListings,
  updateListing,
} from './marketplace.controller.js';

const marketplaceRouter = Router();

marketplaceRouter.post('/farmer/create-listing', requireAuth, requireRole('farmer'), createListing);
marketplaceRouter.get('/farmer/my-listings', requireAuth, requireRole('farmer'), getMyListings);
marketplaceRouter.get('/listings', getListings);
marketplaceRouter.get('/my-listings', requireAuth, requireRole('farmer'), getMyListings);
marketplaceRouter.get('/listings/:id', getListingById);
marketplaceRouter.post('/listings', requireAuth, requireRole('farmer'), createListing);
marketplaceRouter.patch('/listings/:id', requireAuth, requireRole('farmer'), updateListing);
marketplaceRouter.delete('/listings/:id', requireAuth, requireRole('farmer'), deleteListing);

export { marketplaceRouter };
