import { Router, Request, Response } from 'express';
import { QualityProfileService } from '../services/QualityProfileService';
import { QualityProfile, ErrorResponse } from '../../shared/types';

export function createQualityProfileRoutes(qualityProfileService: QualityProfileService): Router {
  const router = Router();

  // GET /api/quality-profiles - Get all quality profiles
  router.get('/', (_req: Request, res: Response) => {
    try {
      const profiles = qualityProfileService.getAllProfiles();
      res.json(profiles);
    } catch (error) {
      console.error('Error getting quality profiles:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve quality profiles',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // GET /api/quality-profiles/default - Get default quality profile
  router.get('/default', (_req: Request, res: Response) => {
    try {
      const profile = qualityProfileService.getDefaultProfile();
      
      if (!profile) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No default quality profile found',
          },
        } as ErrorResponse);
      }

      res.json(profile);
    } catch (error) {
      console.error('Error getting default quality profile:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve default quality profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // GET /api/quality-profiles/:id - Get specific quality profile
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = qualityProfileService.getProfile(id);

      if (!profile) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Quality profile with id ${id} not found`,
          },
        } as ErrorResponse);
      }

      res.json(profile);
    } catch (error) {
      console.error('Error getting quality profile:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve quality profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // POST /api/quality-profiles - Create new quality profile
  router.post('/', (req: Request, res: Response) => {
    try {
      const profileData: Omit<QualityProfile, 'id' | 'createdAt'> = req.body;

      if (!profileData.name) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quality profile name is required',
          },
        } as ErrorResponse);
      }

      if (!profileData.formats || profileData.formats.length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one format must be specified',
          },
        } as ErrorResponse);
      }

      const profile = qualityProfileService.createProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      console.error('Error creating quality profile:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        } as ErrorResponse);
      }

      if (error instanceof Error && error.message.includes('Invalid format')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        } as ErrorResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create quality profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // PUT /api/quality-profiles/:id - Update quality profile
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: Partial<QualityProfile> = req.body;

      const profile = qualityProfileService.updateProfile(id, updates);
      res.json(profile);
    } catch (error) {
      console.error('Error updating quality profile:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        } as ErrorResponse);
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        } as ErrorResponse);
      }

      if (error instanceof Error && (error.message.includes('Invalid format') || error.message.includes('must be'))) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        } as ErrorResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update quality profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // DELETE /api/quality-profiles/:id - Delete quality profile
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      qualityProfileService.deleteProfile(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting quality profile:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        } as ErrorResponse);
      }

      if (error instanceof Error && error.message.includes('Cannot delete')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        } as ErrorResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete quality profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  // PATCH /api/quality-profiles/:id/default - Set quality profile as default
  router.patch('/:id/default', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = qualityProfileService.setDefaultProfile(id);
      res.json(profile);
    } catch (error) {
      console.error('Error setting default quality profile:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        } as ErrorResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to set default quality profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      } as ErrorResponse);
    }
  });

  return router;
}
