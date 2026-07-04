import { Router } from 'express';
import { checkAadhaar, sendOTP, verifyOTP } from '../controllers/aadhaar.controller.js';
import { registerAadhaarUser } from '../controllers/aadhaar-register.controller.js';

const router = Router();

router.post('/check', checkAadhaar);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', registerAadhaarUser);

export default router;
