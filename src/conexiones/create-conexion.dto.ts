import { IsString } from 'class-validator';

export class CreateConexionDto {
  @IsString()
  favorId: string;
}
