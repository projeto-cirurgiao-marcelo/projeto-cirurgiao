/**
 * Nome/cargo do professor pra exibição. `instructorName` é texto livre
 * cadastrado no admin ("Dr. Marcelo e Dra. Jaqueline"); sem ele, cai no
 * nome da conta dona do curso (`instructor.name`), que hoje é o admin.
 * Espelha mobile-app/src/lib/course-instructor.ts.
 */
export interface CourseInstructorSource {
  instructorName?: string | null;
  instructorTitle?: string | null;
  instructor?: { name: string } | null;
}

export function courseInstructorName(course: CourseInstructorSource): string | undefined {
  return course.instructorName?.trim() || course.instructor?.name || undefined;
}

export function courseInstructorTitle(course: CourseInstructorSource): string | undefined {
  return course.instructorTitle?.trim() || undefined;
}
