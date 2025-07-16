import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Middleware factory for validating request data against a Joi schema
 * @param schema Joi schema to validate against
 * @param property Request property to validate ('body', 'query', 'params')
 */
export const validateRequest = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: false
        }
      }
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        path: detail.path.join('.'),
        message: detail.message
      }));

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errorDetails,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};