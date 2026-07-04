import { Router } from 'express';
import { checkAadhaar, sendOTP, verifyOTP } from '../controllers/aadhaar.controller';
import { registerAadhaarUser } from '../controllers/aadhaar-register.controller';

const router = Router();

router.post('/check', checkAadhaar);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', registerAadhaarUser);

export default router;
