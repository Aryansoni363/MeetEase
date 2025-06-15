// backend/src/routes/user.routes.js


import {Router} from 'express';
import { loginUser, logoutUser, refreshAccessToken, registerUser, getMe } from '../controllers/user.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
// import { registerUser } from '../controllers/user.controllers.js';



const router = Router();

router.route('/register').post(registerUser);


router.route ('/login').post(loginUser)


//secured routes
router.route('/logout').post(verifyJWT, logoutUser)

router.route('/refresh-token').post(refreshAccessToken)

router.route('/me').get(verifyJWT, getMe)


export default router;
