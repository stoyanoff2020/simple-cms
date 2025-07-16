// Route exports
import { Router } from 'express';
import authRoutes from './auth';
import articleRoutes from './articles';
import categoryRoutes from './categories';
import tagRoutes from './tags';
import searchRoutes from './search';
import publicRoutes from './public';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount article routes
router.use('/articles', articleRoutes);

// Mount category routes
router.use('/categories', categoryRoutes);

// Mount tag routes
router.use('/tags', tagRoutes);

// Mount search routes
router.use('/search', searchRoutes);

// Mount public routes
router.use('/public', publicRoutes);

export default router;