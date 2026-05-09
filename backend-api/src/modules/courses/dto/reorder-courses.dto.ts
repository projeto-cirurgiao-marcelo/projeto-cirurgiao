import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoursePositionItem {
  @IsString()
  id: string;

  @IsInt()
  position: number;
}

export class ReorderCoursesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoursePositionItem)
  courses: CoursePositionItem[];
}
