/**
 * Exportações centralizadas dos serviços de API
 */

export { apiClient, getErrorMessage } from './client';
export { coursesService } from './courses.service';
export { modulesService } from './modules.service';
export { videosService } from './videos.service';

export type { ApiError } from './client';
