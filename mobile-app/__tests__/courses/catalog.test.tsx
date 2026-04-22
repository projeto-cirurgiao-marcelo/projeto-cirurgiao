/**
 * Smoke test da tela Catalog.
 *
 * Valida:
 * 1. Renderiza sem crash com dados mockados de courses.
 * 2. Titulo visivel apos load (ex: 'Cirurgia Geral').
 * 3. Services foram chamados (findAll + getEnrolledCourses).
 */
import { render, waitFor } from '@testing-library/react-native';
import CatalogScreen from '../../app/courses/catalog';

// Mocka os services antes do import.
jest.mock('../../src/services/api/courses.service', () => ({
  coursesService: {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 'c1',
        title: 'Cirurgia Geral',
        slug: 'cirurgia-geral',
        description: null,
        price: 0,
        thumbnailUrl: null,
        thumbnail: null,
        thumbnailVertical: null,
        thumbnailHorizontal: null,
        isPublished: true,
        instructorId: 'i1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'c2',
        title: 'Anestesia Veterinaria',
        slug: 'anestesia',
        description: null,
        price: 0,
        thumbnailUrl: null,
        thumbnail: null,
        thumbnailVertical: null,
        thumbnailHorizontal: null,
        isPublished: true,
        instructorId: 'i1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]),
  },
}));

jest.mock('../../src/services/api/progress.service', () => ({
  progressService: {
    getEnrolledCourses: jest.fn().mockResolvedValue([]),
  },
}));

describe('<CatalogScreen />', () => {
  it('renderiza dois cursos mockados apos load', async () => {
    const { findByText } = render(<CatalogScreen />);

    // Espera a Promise.all() completar e os cards aparecerem.
    expect(await findByText('Cirurgia Geral')).toBeTruthy();
    expect(await findByText('Anestesia Veterinaria')).toBeTruthy();
  });

  it('chama findAll + getEnrolledCourses no mount', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { coursesService } = require('../../src/services/api/courses.service');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { progressService } = require('../../src/services/api/progress.service');

    render(<CatalogScreen />);

    await waitFor(() => {
      expect(coursesService.findAll).toHaveBeenCalledWith({ limit: 100 });
      expect(progressService.getEnrolledCourses).toHaveBeenCalled();
    });
  });
});
