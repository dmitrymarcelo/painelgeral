import { IsBoolean } from 'class-validator';

export class MarkNotificationReadDto {
  @IsBoolean()
  isRead!: boolean;
}
