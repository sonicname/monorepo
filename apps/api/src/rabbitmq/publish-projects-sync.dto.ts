import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export class PublishProjectsSyncDto {
  @IsIn(['web', 'api'])
  source!: 'web' | 'api';

  @IsIn(['manual', 'system'])
  trigger!: 'manual' | 'system';

  @IsOptional()
  @IsISO8601()
  requestedAt?: string;
}
