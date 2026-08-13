import { IsBoolean } from 'class-validator';

export class SuspenderDto {
  @IsBoolean()
  suspendido: boolean;
}
