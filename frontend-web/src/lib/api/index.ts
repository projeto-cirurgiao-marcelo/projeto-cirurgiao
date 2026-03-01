/**
 * Exportações centralizadas dos serviços de API
 */

export { apiClient, getErrorMessage } from './client';
export { coursesService } from './courses.service';
export { modulesService } from './modules.service';
export { videosService } from './videos.service';
export { captionsService } from './captions.service';
export { chatbotService } from './chatbot.service';
export { quizzesService } from './quizzes.service';
export { summariesService } from './summaries.service';
export { usersService } from './users.service';

export type { ApiError } from './client';
